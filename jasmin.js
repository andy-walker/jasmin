var fs     = require('fs');
var Buffer = require('buffer').Buffer;

/**
 * Assemble the specified filename to an array of bytes
 */
function assemble(filename) {

}

/**
 * Write array of bytes to file
 */
function writeFile(filename, asmCode) {
    // todo: open file for binary output
}

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