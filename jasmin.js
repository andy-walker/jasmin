/**
 * jasmin
 * minimal javascript assembler
 * andyw, 24/03/2014
 */

var fs     = require('fs');
var Buffer = require('buffer').Buffer;

var INSTRUCTION_INC = 1;

/**
 * Helper string prototype - determines if the character exists in a string
 * *outside* of quotation marks
 */
String.prototype.scanFor = function(match_char) {
    
    quote_count = 0;
    matched     = false;
    
    this.split('').every(function(current_char) {
        if (current_char == '"')
            quote_count++;
        // if matched character, and even or zero number of quotes to the left hand side
        // set matched to true and return false to stop scanning
        else if (current_char == match_char && quote_count % 2 == 0)
            return !(matched = true);

    });
    
    return matched;

};

/**
 * Assemble the specified filename to an array of bytes
 */
var assemble = function(filename) {

    // helper function
    var convert_value = function(number, byte_position) {
        if (byte_position == 1)
            return (number & 0xff);
        return (number >> 8);
    };
 
    // initialize assembler vars
    var relocs             = [], 
        instruction_name   = '', 
        tokens             = [],
        instruction_offset = {},
        buffer             = [];

    var tokens;
    var names = 0, offset = 0, line_number = 0;
    var fatal = false;

    // load opcode info
    try {
        var instructions = require('./opcodes.json');
    } catch (error) {
        console.log("Error reading opcodes.json");
        process.exit(1);
    }

    // read input file and iterate line by line
    fs.readFileSync(filename, 'utf8')
        
        .split("\n")
        .every(function(line) {
            
            line_number++;
            line = line.trim();

            if (line.length) {
                
                // tokenize line
                if (tokens = tokenize(line)) { 
                    
                    var token = tokens.shift();

                    if (line.scanFor(':')) {
                        
                        instruction_offset[token] = offset;
                        console.log("offset[" + token + "] = " + offset);
                        
                        // if no more tokens, continue on to next line
                        if (!(token = tokens.shift()))
                            return true;
                    
                    }

                    // attempt to match instruction name to opcode
                    instructions.every(function(instruction, index) {
                        
                        // if matched ..
                        if (token == instruction.name) {
       
                            instruction_name = instruction.name;
                            console.log(
                                "instruction (\n" + 
                                "   size: "     + instruction.size   + "\n" +
                                "   bytecode: " + instruction.opcode + "\n" +
                                "   name: "     + instruction.name   + "\n" + 
                                ")\n" + 
                                "at offset: " + offset + "\n\n"
                            );

                            buffer[offset] = instruction.opcode; 

                            // parse instruction args ..                                
                            switch (instruction.type) {
                                
                                case 'TYPE_IDENTIFIER':
                                    
                                    if (token = tokens.shift()) {
                                        instructions.forEach(function(_instruction) {
                                            if (token == _instruction.identifier && instruction_name == _instruction.name) {
                                                instruction    = _instruction;
                                                buffer[offset] = instruction.opcode;
                                                console.log("Identifier corrected instruction opcode: " + instruction.opcode);
                                            }
                                        });
                                    } else {
                                        console.log("No address specified on line " + line_number);
                                        process.exit(1);
                                    }

                                    break;

                                case 'TYPE_OFFSET':
                                    // an offset relocation needs to be done
                                    if (token = tokens.shift()) {
                                        relocs.push({
                                            name:  token,
                                            where: offset + INSTRUCTION_INC
                                        });
                                    } else {
                                        console.log("No address specified on line " + line_number);
                                        process.exit(1);
                                    }

                                    break;

                                case 'TYPE_BYTE':
                                    
                                    if (token = tokens.shift()) {
                                        buffer[offset+1] = parseInt(token) & 0xff;
                                    } else {
                                        console.log("No register/value specified on line " + line_number);
                                        process.exit(1);
                                    }

                                    break;
                                
                                case 'TYPE_INT':

                                    if (token = tokens.shift()) {
                                        buffer[offset+1] = parseInt(token) >> 8 & 0xff;
                                        buffer[offset+2] = parseInt(token) & 0xff;
                                    } else {
                                        console.log("No register/value specified on line " + line_number);
                                        process.exit(1);  
                                    }

                                    break;

                                case 'TYPE_4INT':

                                    if (token = tokens.shift()) {
                                        buffer[offset+1] = parseInt(token) >> 24 & 0xff;
                                        buffer[offset+2] = parseInt(token) >> 16 & 0xff;
                                        buffer[offset+3] = parseInt(token) >> 8  & 0xff;
                                        buffer[offset+4] = parseInt(token) & 0xff;
                                    } else {
                                        console.log("No register/value specified on line " + line_number);
                                        process.exit(1);  
                                    }

                                    break;

                                case 'TYPE_CHAR':
                                    
                                    if (token = tokens.shift())
                                        token = token.match(/^"."$/).pop();

                                    if (token) {
                                        buffer[offset+1] = token.slice(1, -1).charCodeAt(0);
                                    } else {
                                        console.log("No character specified on line " + line_number);
                                        process.exit(1);                                         
                                    }

                                    break;

                                case 'TYPE_STRING':
                                    
                                    if (token = tokens.shift())
                                        token = token.match(/^".*"$/g).pop();
                                    
                                    if (token) {
                                        token = token.slice(1, -1);
                                        token.split('').forEach(function(character, index) {
                                            buffer[offset+index+1] = character.charCodeAt(0);
                                        });
                                        buffer.push(0); // add string terminator
                                        offset += token.length + 1;
                                    } else {
                                        console.log("No string specified on line " + line_number);
                                        process.exit(1);                                         
                                    }

                                    break;
                                
                                case 'TYPE_DEFINE_BYTE':
                                    
                                    if (token = tokens.shift()) {
                                        buffer[offset] = parseInt(token) & 0xff;
                                    } else {
                                        console.log("No byte defined on line " + line_number);
                                        process.exit(1);  
                                    }  

                                    break;

                                case 'TYPE_DEFINE_4INT':

                                    if (token = tokens.shift()) {
                                        buffer[offset]   = parseInt(token) >> 24 & 0xff;
                                        buffer[offset+1] = parseInt(token) >> 16 & 0xff;
                                        buffer[offset+2] = parseInt(token) >> 8  & 0xff;
                                        buffer[offset+3] = parseInt(token) & 0xff;                                       
                                    } else {
                                        console.log("No int defined on line " + line_number);
                                        process.exit(1);                                        
                                    }

                                    break;

                                case 'TYPE_DEFINE_INT':

                                    if (token = tokens.shift()) {
                                        buffer[offset]   = parseInt(token) >> 8 & 0xff;
                                        buffer[offset+1] = parseInt(token) & 0xff;                                         
                                    } else {
                                        console.log("No int defined on line " + line_number);
                                        process.exit(1);   
                                    }

                                    break;

                                case 'TYPE_DEFINE_CHAR':
                                    
                                    if (token = tokens.shift())
                                        token = token.match(/^"."$/).pop();

                                    if (token) {
                                        buffer[offset] = token.slice(1, -1).charCodeAt(0);
                                    } else {
                                        console.log("No character defined on line " + line_number);
                                        process.exit(1);                                         
                                    }

                                    break;
                                
                                case 'TYPE_DEFINE_STRING':

                                    if (token = tokens.shift() && token.match(/"/g) == 2) {
                                        token = token.replace('"', '');
                                        token.split('').forEach(function(character, index) {
                                            buffer[offset+index] = character.charCodeAt(0);
                                        });
                                        offset += token.length;
                                    } else {
                                        console.log("No string specified on line " + line_number);
                                        process.exit(1);                                         
                                    }

                                    break;

                                case 'TYPE_ONLY_OPCODE':
                                case 'TYPE_NONE':
                                    break;
                                
                                default:
                                    return !(fatal = true);
                                    
                            }
                            
                            // increment offset by instruction size
                            offset += instruction.size;
                            offset+=INSTRUCTION_INC;
                            
                            // second param ..
                            if (instruction.type_b != 'TYPE_NONE') {
                                
                                switch (instruction.type_b) {
                                    
                                    case 'TYPE_OFFSET':
                                        
                                        // an offset relocation needs to be done
                                        if (token = tokens.shift()) {
                                            relocs.push({
                                                name:  token,
                                                where: offset + INSTRUCTION_INC
                                            });
                                        } else {
                                            console.log("No address specified on line " + line_number);
                                            process.exit(1);
                                        }

                                        break;
                                
                                    case 'TYPE_BYTE':
                                    
                                        if (token = tokens.shift()) {
                                            buffer[offset] = parseInt(token) & 0xff;
                                        } else {
                                            console.log("No register/value specified on line " + line_number);
                                            process.exit(1);
                                        }

                                        break;

                                    case 'TYPE_INT':
                                        
                                        if (token = tokens.shift()) {
                                            buffer[offset]   = parseInt(token) >> 8 & 0xff;
                                            buffer[offset+1] = parseInt(token) & 0xff;
                                        } else {
                                            console.log("No register/value specified on line " + line_number);
                                            process.exit(1);  
                                        }

                                        break;

                                    case 'TYPE_4INT':

                                        if (token = tokens.shift()) {
                                            buffer[offset]   = parseInt(token) >> 24 & 0xff;
                                            buffer[offset+1] = parseInt(token) >> 16 & 0xff;
                                            buffer[offset+2] = parseInt(token) >> 8  & 0xff;
                                            buffer[offset+3] = parseInt(token) & 0xff;
                                        } else {
                                            console.log("No register/value specified on line " + line_number);
                                            process.exit(1);  
                                        }                                   

                                        break;

                                    case 'TYPE_CHAR':
                                        
                                        if (token = tokens.shift())
                                            token = token.match(/^"."$/).pop();

                                        if (token) {
                                            buffer[offset] = token.slice(1, -1).charCodeAt(0);
                                        } else {
                                            console.log("No character specified on line " + line_number);
                                            process.exit(1);                                         
                                        }

                                        break;

                                    case 'TYPE_STRING':

                                        if (token = tokens.shift())
                                            token = token.match(/^".*"$/g).pop();
                                        
                                        if (token) {
                                            token = token.slice(1, -1);
                                            token.split('').forEach(function(character, index) {
                                                buffer[offset+index] = character.charCodeAt(0);
                                            });
                                            buffer.push(0); // add string terminator
                                            offset += token.length + 1;
                                        } else {
                                            console.log("No string specified on line " + line_number);
                                            process.exit(1);                                         
                                        }                                 

                                        break;

                                    case 'TYPE_DEFINE_BYTE':

                                        if (token = tokens.shift()) {
                                            buffer[offset] = parseInt(token) & 0xff;
                                        } else {
                                            console.log("No byte defined on line " + line_number);
                                            process.exit(1);  
                                        }  

                                        break;

                                    case 'TYPE_ONLY_OPCODE':
                                    case 'TYPE_NONE':
                                        break;                                   
     
                                    default:
                                        console.log("Error assembling file: " + line_number);
                                        process.exit(1);

                                }
                                offset += instruction.size_b;
                            }

                        }

                        return true;

                    });

                    if (fatal)
                        return false;

                }
            
            } 
            return true;
        });

        if (fatal)
            return false;

    // relocs
    console.log("Number of relocs to be done: " + relocs.length);
    relocs.forEach(function(reloc) {
        
        var relocnotfound = true;
        console.log("Label '" + reloc.name + "' at offset " + reloc.where);
        
        offset_names.every(function(offset_name, index) {
            if (offset_name == reloc.name) {
                console.log("Found '" + reloc.name + "' in offset table");
                buffer[reloc.where]   = convert_value(instruction_offset[index], 0);
                buffer[reloc.where+1] = convert_value(instruction_offset[index], 1);
                return relocnotfound = false;
            }
        });
        
        if (relocnotfound) {
            console.log("Error: offset '" + reloc.name + "' not found.");
            process.exit(1);
        }
    
    });

    return buffer;

};

/**
 * tokenizer - split line into array of tokens
 */
var tokenize = function(line) {
    
    var tokens    = [];
    var buffer    = '';
    var in_quotes = false;

    // for each character ..
    line.split('').every(function(character) {

        // when inside quotes, copy characters to buffer until we encounter
        // another quotation mark
        if (in_quotes) {
            buffer += character;
            if (character == '"') {
                in_quotes = false;
                tokens.push(buffer);
                buffer = '';
            }
            return true;
        }

        // when not inside quotes ..
        switch (true) {

            // delimit on space, tab, comma and colon characters
            case [" ", "\t", ",", ":"].indexOf(character) >= 0:
                if (buffer)
                    tokens.push(buffer);
                buffer = '';
                break;

            // if a quotation mark, enter in_quotes mode
            case character == '"':
                buffer += character;
                in_quotes = true;
                break;

            // ignore anything after semicolon
            case character == ';':
                return false;
            
            // all other characters, copy to buffer
            default:
                buffer += character;
                break;
        
        }

        return true;

    });

    if (buffer)
        tokens.push(buffer);

    return tokens;

};

/**
 * Get arguments and options that were passed in
 */
var getConfig = function() {
    
    config = {
        input_file:    '',
        output_file:   '',
        output_format: '',
        output_arch:   ''
    };

    process.argv.slice(2).forEach(function(value) {
        
        // attempt to split item on '=', if length is 2, treat as option
        var splitValue = value.split('=');
        
        if (splitValue.length > 1) {
            
            switch (splitValue[0]) {
                case '--format':
                    config.output_format = splitValue[1];
                    break;
                case '--arch':
                    config.output_arch = splitValue[1];
                    break;
                default:
                    console.log("Unrecognized option '" + splitValue[0] + "'.");
                    process.exit(1);
            }

        // otherwise, item is an argument
        } else {
            
            if (!config.input_file)
                config.input_file = value;
            else
                config.output_file = value;
        
        }

    });

    // check at least input file specified
    if (!config.input_file) {
        console.log("Usage: node jasmin.js <input-file> [output-file] [options]");
        process.exit(1);
    }

    // set defaults if not specified
    if (!config.output_file)
        config.output_file = 'out.bytes';

    return config;

};

/**
 * Write array of bytes to file
 */
var writeFile = function(filename, asmCode) {

    var file    = fs.openSync(filename, 'w');
    var buffer  = new Buffer(asmCode);
    var written = fs.writeSync(file, buffer, 0, buffer.length, 0);

    return written == buffer.length;

};

/**
 * Begin main execution 
 */
(function() {
    
    config = getConfig();

    // check input file exists
    if (!fs.existsSync(config.input_file)) {
        console.log("Input file '" + config.input_file + "' does not exist.");
        process.exit(1);
    }

    // assemble input file
    if (asmCode = assemble(config.input_file)) {

        console.log("Assembled to " + asmCode.length + " bytes.");

        // write to output file
        if (!writeFile(config.output_file, asmCode)) {
            console.log("An error occurred writing to " + config.output_file);
            process.exit(1);
        }
        
    } else {
        console.log("An error occurred assembling the file.");
        process.exit(1);
    }

}).call(this);