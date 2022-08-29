//SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IFakeNFTMarketPlace {
    function purchase(uint256 _tokenId) external payable;

    function getPrice() external view returns(uint256);

    function available(uint256 _tokenId) external view returns(bool);
}

interface ICryptoDevsNFT {
    function balanceOf(address owner) external view returns(uint256);

    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns(uint256);
}

contract CryptoDevsDao is Ownable {
    enum Vote {
        Yes,
        No
    }
    struct Proposal{
        //nft token to purchase
        uint256 nftTokenId;
        //proposal deadline
        uint256 deadline;
        //yes and no votes 
        uint256 yesVotes;
        uint256 noVotes;
        bool executed;

        mapping(uint256 => bool) voters;
    }

    mapping(uint256 => Proposal) public proposals;
    uint256 public numProposals;

    //create a reference of the smart contracts with interface created above 

    IFakeNFTMarketPlace nftMarketPlace;
    ICryptoDevsNFT cryptoDevsNFT;

    constructor(address _nftMarketPlace, address _cryptoDevsNFT) payable {
        nftMarketPlace = IFakeNFTMarketPlace(_nftMarketPlace);
        cryptoDevsNFT = ICryptoDevsNFT(_cryptoDevsNFT);
    }

    modifier nftHoldersOnly() {
        require(cryptoDevsNFT.balanceOf(msg.sender) > 0, "You do not own a Crypto Devs nft");
        _;
    }

    modifier activeProposalOnly(uint256 _id) {
        require((proposals[_id].deadline) > block.timestamp, "proposal is active");
        _;
    }

    modifier inActiveProposalOnly(uint256 _id) {
        require((proposals[_id].deadline) <= block.timestamp);
        require((proposals[_id].executed) == false, "proposal is still active");
        _;
    }

    //create proposal that accepts tokenId of the nft you want to buy and return the id of the proposal
    function createProposal(uint256 _nftTokenId) external nftHoldersOnly returns(uint256) {
        require(nftMarketPlace.available(_nftTokenId), "nft is not available for sale");

        //create a variable "proposal" of type "Proposal"(created as a struct above)
        //initialize to the struct "Proposal" with index of "numProposals" (as represented by the mapping of proposals)
        Proposal storage proposal = proposals[numProposals];
        proposal.nftTokenId = _nftTokenId;
        proposal.deadline = block.timestamp + 5 minutes;

        numProposals++;
        return (numProposals - 1);
    }

    function voteOnProposal(uint256 _id, Vote _vote) external nftHoldersOnly activeProposalOnly(_id) {
        Proposal storage proposal = proposals[_id];

        uint256 voterBalance = cryptoDevsNFT.balanceOf(msg.sender);

        uint256 numOfVotes;
        for(uint256 i = 0; i < voterBalance; i++) {
            uint256 tokenId = cryptoDevsNFT.tokenOfOwnerByIndex(msg.sender, i);
            if(proposal.voters[tokenId] == false) {
                numOfVotes++;
                proposal.voters[tokenId] = true;
            }
        }

        require(numOfVotes > 0, "You have already voted!");
        if(_vote == Vote.Yes) {
            proposal.yesVotes += numOfVotes;
        }else {
            proposal.noVotes += numOfVotes;
        }
    }

    function executeProposal(uint256 _id) external nftHoldersOnly inActiveProposalOnly(_id) {
        Proposal storage proposal = proposals[_id];

        if(proposal.yesVotes > proposal.noVotes) {
            uint256 nftPrice = nftMarketPlace.getPrice();
            require(address(this).balance > nftPrice, "Insufficient fund");

            nftMarketPlace.purchase{value: nftPrice}(proposal.nftTokenId);
        }
        proposal.executed = true;
    }

    function withdrawEther() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    receive() external payable {}
    fallback() external payable {}
}