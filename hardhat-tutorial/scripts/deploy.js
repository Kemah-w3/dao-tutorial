const { ethers } = require("hardhat")
const { CRYPTODEVS_NFT_CONTRACT_ADDRESS } = require("../constants")

async function main() {
  const FakeNFTMarketPlace = await ethers.getContractFactory("FakeNFTMarketPlace")
  const fakeNFTMarketPlace = await FakeNFTMarketPlace.deploy()
  await fakeNFTMarketPlace.deployed()

  console.log(`nftMarketPlace contract successfully deployed to : ${fakeNFTMarketPlace.address}`)

  const CryptoDevsDao = await ethers.getContractFactory("CryptoDevsDao")
  const cryptoDevsDao = await CryptoDevsDao.deploy(
    fakeNFTMarketPlace.address,
    CRYPTODEVS_NFT_CONTRACT_ADDRESS,
    {
      value: ethers.utils.parseEther("0.01")
    }
  )
  await cryptoDevsDao.deployed()
  console.log(`CryptoDevsDao successfully deployed to: ${cryptoDevsDao.address}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })