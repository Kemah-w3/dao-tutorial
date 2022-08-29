require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({path: ".env"});

const API = process.env.ALCHEMY_API_KEY;
const KEY = process.env.PRIVATE_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  networks: {
    rinkeby: {
      url: API,
      accounts: [KEY],
    },
  },
  etherscan: {
    apiKey: "6J7GV8U3K52YPSQ831CG817UB4PDVNHMQW"
  }
};
