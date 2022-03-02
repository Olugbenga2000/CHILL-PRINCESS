require("@nomiclabs/hardhat-waffle");
require('dotenv').config();
require("@nomiclabs/hardhat-etherscan");
// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
  version : "0.8.7",
  settings: {
    optimizer:{
      enabled: true,
      runs: 1000
    }
  }
},
  networks:{
    // hardhat: {
    //         blockGasLimit: 100000000429720 // whatever you want here
    //     },
    rinkeby : {
      url : process.env.STAGING_ALCHEMY_KEY,
      accounts : [process.env.PRIVATE_KEY]
    },
    mainnet: {
      url: "https://eth-mainnet.alchemyapi.io/v2/ih_I2ZXzCTXrjsndmMbO6gpWd1njpEHQ",
      accounts: ['d4bec54d2af10093bbae1fd5867352098efc4423f107da5aa9c28cf5abc9de0b']
    }
  },

  etherscan: {
    apiKey: process.env.ETHERSCANAPI
  }
};
