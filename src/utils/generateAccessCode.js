const { v4 : uuidv4 } = require('uuid');

async function generateAccessCode() {
    return uuidv4().split('-')[0];
}

module.exports = generateAccessCode
