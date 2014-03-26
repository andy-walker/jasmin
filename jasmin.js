/**
 * Minimal assembler in javascript
 * andyw, 24/03/2014
 */

var fs     = require('fs');
var Buffer = require('buffer').Buffer;

var INSTRUCTION_INC = 1;

/**
 * Assemble the specified filename to an array of bytes
 */
var assemble = function(filename) {
    
    // initialize assembler vars
    var relocs             = [], 
        instruction_name   = '', 
        row                = [],
        instruction_offset = {},
        tmp                = [];

    var i, i2, i3;

    var tmprow;
    var names = 0, offset = 0, offset_there, line_number = 0;
    var relocnotfound;
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

            // trim leading/trailing whitespace, and anything after ';'
            line = line.trim().split(';').shift();

            if (line.length) {
                
                // tokenize (split on colon, space, tab and comma)
                if (tmprow = line.split(/[\:\s,]/)) { 
                    
                    var token = tmprow.shift();

                    if (line.indexOf(':') >= 0) {
                        
                        instruction_offset[token] = offset;
                        console.log("offset[" + token + "] = " + offset);
                        
                        // if no more tokens, continue on to next line
                        if (!(token = tmprow.shift()))
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

                            // parse instruction args ..                                
                            switch (instruction.type) {
                                
                                case 'TYPE_IDENTIFIER':
                                    
                                    if (token = tmprow.shift()) {
                                        instructions.forEach(function(_instruction) {
                                            if (token == _instruction.identifier && instruction_name == _instruction.name) {
                                                instruction = _instruction;
                                                tmp[offset] = instruction.opcode;
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
                                    if (token = tmprow.shift()) {
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
                                    
                                    if (token = tmprow.shift()) {
                                        tmp[offset+1] = parseInt(token) & 0xff;
                                    } else {
                                        console.log("No register/value specified on line " + line_number);
                                        process.exit(1);
                                    }

                                    break;
                                
                                case 'TYPE_INT':

                                    if (token = tmprow.shift()) {
                                        tmp[offset+1] = parseInt(token) >> 8 & 0xff;
                                        tmp[offset+2] = parseInt(token) & 0xff;
                                    } else {
                                        console.log("No register/value specified on line " + line_number);
                                        process.exit(1);  
                                    }

                                    break;

                                case 'TYPE_4INT':

                                    if (token = tmprow.shift()) {
                                        tmp[offset+1] = parseInt(token) >> 24 & 0xff;
                                        tmp[offset+2] = parseInt(token) >> 16 & 0xff;
                                        tmp[offset+3] = parseInt(token) >> 8  & 0xff;
                                        tmp[offset+4] = parseInt(token) & 0xff;
                                    } else {
                                        console.log("No register/value specified on line " + line_number);
                                        process.exit(1);  
                                    }

                                    break;

                                case 'TYPE_CHAR':
                                    // todo: this will get broken by spaces, commas and quotes inside quotes
                                    // but to test for now ..
                                    if (token = tmprow.shift() && token.match(/"/g) == 2) {
                                        tmp[offset+1] = token.replace('"', '').charCodeAt(0); 
                                    } else {
                                        console.log("No character specified on line " + line_number);
                                        process.exit(1);                                         
                                    }

                                    break;

                                case 'TYPE_STRING':

                                    if (token = tmprow.shift() && token.match(/"/g) == 2) {
                                        token = token.replace('"', '');
                                        token.split('').forEach(function(character, index)) {
                                            tmp[offset+index+1] = character.charCodeAt(0);
                                        });
                                        offset += token.length + 1;
                                    } else {
                                        console.log("No string specified on line " + line_number);
                                        process.exit(1);                                         
                                    }

                                    break;
                                
                                case 'TYPE_DEFINE_BYTE':
                                    
                                    if (token = tmprow.shift()) {
                                        tmp[offset] = parseInt(token) & 0xff;
                                    } else {
                                        console.log("No byte defined on line " + line_number);
                                        process.exit(1);  
                                    }  

                                    break;

                                case 'TYPE_DEFINE_4INT':

                                    if (token = tmprow.shift()) {
                                        tmp[offset]   = parseInt(token) >> 24 & 0xff;
                                        tmp[offset+1] = parseInt(token) >> 16 & 0xff;
                                        tmp[offset+2] = parseInt(token) >> 8  & 0xff;
                                        tmp[offset+3] = parseInt(token) & 0xff;                                       
                                    } else {
                                        console.log("No int defined on line " + line_number);
                                        process.exit(1);                                        
                                    }

                                    break;

                                case 'TYPE_DEFINE_INT':

                                    if (token = tmprow.shift()) {
                                        tmp[offset]   = parseInt(token) >> 8 & 0xff;
                                        tmp[offset+1] = parseInt(token) & 0xff;                                         
                                    } else {
                                        console.log("No int defined on line " + line_number);
                                        process.exit(1);   
                                    }

                                    break;

                                case 'TYPE_DEFINE_CHAR':
                                    
                                    if (token = tmprow.shift() && token.match(/"/g) == 2) {
                                        tmp[offset] = token.replace('"', '').charCodeAt(0); 
                                    } else {
                                        console.log("No character defined on line " + line_number);
                                        process.exit(1);                                         
                                    }

                                    break;
                                
                                case 'TYPE_DEFINE_STRING':

                                    if (token = tmprow.shift() && token.match(/"/g) == 2) {
                                        token = token.replace('"', '');
                                        token.split('').forEach(function(character, index)) {
                                            tmp[offset+index] = character.charCodeAt(0);
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

};

/**
 * Write array of bytes to file
 */
var writeFile = function(filename, asmCode) {
    // todo: open file for binary output
};

/**
 * Begin main execution 
 */
(function() {
    
    var argv = process.argv;

    // check at least input file specified
    if (argv.length <= 2) {
        console.log("Usage: node jasmin.js <input-file> [output-file]");
        process.exit(1);
    }

    // check input file exists
    if (!fs.existsSync(argv[2])) {
        console.log("Input file '" + argv[2] + "' does not exist.");
        process.exit(1);
    }

    // assemble input file
    if (asmCode = assemble(argv[2])) {
        
        console.log("Assembled to " + asmCode.length + " bytes.");
        
        // use specified output file or default if not supplied
        var filename = argv.length >= 3 ? argv[3] : 'out.bytes';

        // write to output file
        if (!writeFile(filename, asmCode)) {
            console.log("An error occurred writing to " + filename);
            process.exit(1);
        }
        
    } else {
        console.log("An error occurred assembling the file.");
        process.exit(1);
    }

}).call(this);