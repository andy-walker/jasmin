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
        instruction_name   = [], 
        row                = [],
        instruction_offset = {},
        tmp                = [];

    var i, i2, i3;

    var tmprow;
    var names = 0, offset = 0, offset_there, line_number = 0;
    var relocnotfound;

    // load opcode info
    var instructions = require('./opcodes.json');

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

                }
            
            } 
            
        });


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