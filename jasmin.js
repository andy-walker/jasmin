/**
 * Minimal assembler in javascript
 * andyw, 24/03/2014
 */

var fs     = require('fs');
var Buffer = require('buffer').Buffer;

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
        .map(function(line) {
            
            line_number++;

            // trim leading/trailing whitespace, and anything after ';'
            line = line.trim().split(';').shift();

            if (line.length) {
                
                // tokenize (split on colon, space, tab and comma)
                if (tmprow = line.split(/[\:\s,]/)) { 

                    if (line.indexOf(':') >= 0) {
                        instruction_offset[tmprow[0]] = offset;
                        console.log("offset[" + tmprow[0] + "] = " + offset);
                    }

                    // attempt to match instruction name to opcode
                    instructions.forEach(function(instruction, index) {
                        
                        // if matched ..
                        if (instruction.name == tmprow[0]) {
                               
                            instruction_name = instruction.name;
                            console.log(
                                "instruction (\n" + 
                                "   size: " + instruction.size + "\n" +
                                "   bytecode: " + instruction.opcode + "\n" +
                                "   name: " + instruction.name + "\n" + 
                                ")\n" + 
                                "at offset: " + offset + "\n\n"
                            );

                            // parse instruction args ..
                            if (instruction.type != 'TYPE_NONE') {
                                switch (instruction.type) {
                                    case 'TYPE_IDENTIFIER':
                                        break;
                                    case 'TYPE_OFFSET':
                                        break;
                                    case 'TYPE_BYTE':
                                        break;
                                    case 'TYPE_INT':
                                        break;
                                    case 'TYPE_4INT':
                                        break;
                                    case 'TYPE_CHAR':
                                        break;
                                    case 'TYPE_STRING':
                                        break;
                                    case 'TYPE_DEFINE_BYTE':
                                        break;
                                    case 'TYPE_DEFINE_4INT':
                                        break;
                                    case 'TYPE_DEFINE_INT':
                                        break;
                                    case 'TYPE_DEFINE_CHAR':
                                        break;
                                    case 'TYPE_DEFINE_STRING':
                                        break;
                                    case 'TYPE_ONLY_OPCODE':
                                    case 'TYPE_NONE':
                                        break;
                                    default:
                                        fatal = true;
                                        return false;
                                
                                }
                            
                            }

                        }

                    });

                    if (fatal)
                        return false;

                }
            
            } 
            
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