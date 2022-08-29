import Head from "next/head";
import styles from "../styles/Home.module.css"
import { useState, useEffect, useRef } from "react";
import {
  CRYPTODEVS_DAO_ABI,
  CRYPTODEVS_NFT_ABI,
  CRYPTODEVS_DAO_CONTRACT_ADDRESS,
  CRYPTODEVS_NFT_CONTRACT_ADDRESS
} from "../constants";
import Web3Modal from "web3modal"
import { Contract, providers } from "ethers";
import { formatEther } from "ethers/lib/utils"


export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [treasuryBalance, setTreasuryBalance] = useState("0");
  const [userNFTBalance, setUserNFTBalance] = useState(0);
  const [numOfProposalsInDAO, setNumOfProposalsInDAO] = useState("0");
  const [daoProposals, setDaoProposals] = useState([]);
  const [fakeNFTTokenId, setFakeNFTTokenId] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState("");
  const web3ModalRef = useRef();

  const getCryptoDevsDAOContractInstance = async (providerOrSigner) => {
    return(
      new Contract(
        CRYPTODEVS_DAO_CONTRACT_ADDRESS,
        CRYPTODEVS_DAO_ABI,
        providerOrSigner
      )
    );
  };

  const getCryptoDevsNFTContractInstance = async (providerOrSigner) => {
    return(
      new Contract(
        CRYPTODEVS_NFT_CONTRACT_ADDRESS,
        CRYPTODEVS_NFT_ABI,
        providerOrSigner
      )
    );
  };

  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();

    if(chainId !== 4) {
      window.alert("Please connect to the rinkeby network!");
      throw new Error("Please connect to the rinkeby network!");
    }

    if(needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }

    return web3Provider;
  };

  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (error) {
      console.error(error);
    }
  };

  const getDAOTreasuryBalance = async () => {
    try {
      const provider = await getProviderOrSigner();
      const balance = await provider.getBalance(
        CRYPTODEVS_NFT_CONTRACT_ADDRESS
      );
      setTreasuryBalance(balance.toString());
    } catch (error) {
      console.error(error)
    }
  };

  const getUserNFTBalance = async () => {
    try {
      const  signer = await getProviderOrSigner(true);
      const nftContract = await getCryptoDevsNFTContractInstance(signer);
      const signerAddress = await signer.getAddress();
      const nftBalance = await nftContract.balanceOf(signerAddress);
      setUserNFTBalance(parseInt(nftBalance.toString()));
    } catch (error) {
      console.error(error);
    }
  };

  const getNumOfProposalsInDAO = async () => {
    try {
      const provider = await getProviderOrSigner();
      const DAOContract = await getCryptoDevsDAOContractInstance(provider);
      const numOfProposals = await DAOContract.numProposals();
      setNumOfProposalsInDAO(numOfProposals.toString());
    } catch (error) {
      console.error(error)
    }
  };

  const createDaoProposal = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = await getCryptoDevsDAOContractInstance(signer);
      const txn = await daoContract.createProposal(fakeNFTTokenId);
      setLoading(true);
      await txn.wait();
      await getNumOfProposalsInDAO();
      setLoading(false);
    } catch (error) {
      console.error(error);
      // window.alert(error.data.message);
    }
  };


  const fetchProposalById = async (id) => {
    try {
      const provider = await getProviderOrSigner();
      const DAOContract = await getCryptoDevsDAOContractInstance(provider);
      const _proposal = await DAOContract.proposals(id);
      const parsedProposal = {
        proposalId: id,
        nftTokenId: _proposal.nftTokenId.toString(),
        deadline: new Date(parseInt(_proposal.deadline.toString()) * 1000),
        yesVotes: _proposal.yesVotes,
        noVotes: _proposal.noVotes,
        executed: _proposal.executed
      };
      return parsedProposal;
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAllProposals = async () => {
    try {
      const _daoproposals = [];
      for(let i = 0; i < numOfProposalsInDAO; i++) {
        const _daoproposal = await fetchProposalById(i);
        _daoproposals.push(_daoproposal);
      }
      setDaoProposals(_daoproposals);
    } catch (error) {
      console.error(error);
    }
  };

  const voteOnProposal = async (proposalId, _vote) => {
    try {
      const signer = await getProviderOrSigner(true);
      const DAOContract = await getCryptoDevsDAOContractInstance(signer);
      const vote = _vote === "Yes" ? 0 : 1;
      const txn = await DAOContract.voteOnProposal(proposalId, vote);
      setLoading(true);
      await txn.wait();
      await fetchAllProposals();
      setLoading(false)
    } catch (error) {
      console.error(error);
    //   window.alert(error.data.message)
    }
  }

  const executeProposal = async (proposalId) => {
    try {
      const signer = await getProviderOrSigner(true);
      const DAOContract = await getCryptoDevsDAOContractInstance(signer);
      const txn = await DAOContract.executeProposal(proposalId);
      setLoading(true)
      await txn.wait();
      await fetchAllProposals();
      setLoading(false);
    } catch (error) {
      console.error(error)
      window.alert(error.data.message)
    }
  }

  useEffect(() => {
    if(!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false
      });
      connectWallet().then(() => {
        getDAOTreasuryBalance();
        getUserNFTBalance();
        getNumOfProposalsInDAO();
      });
    }
  }, [walletConnected]);

  useEffect(() => {
    if(selectedTab === "View Proposals") {
      fetchAllProposals();
    }
  }, [selectedTab])

  function renderTabs() {
    if(selectedTab === "View Proposals") {
      return renderViewProposalsTab();
    } else if(selectedTab === "Create Proposal") {
      return renderCreateProposalTab();
    }
    return null;
  }

  function renderCreateProposalTab() {
    if(loading) {
      return(
        <div className={styles.description}>
          loading... Waiting for transaction...
        </div>
      );
    } else if(userNFTBalance === 0) {
      return(
        <div className={styles.description}>
          You do not own any CryptoDevs NFT <br/>
          <b>You can not create or vote on proposals!</b>
        </div>
      );
    } else {
      return(
        <div className={styles.description}>
          <label>Fake NFT Token Id to purchase: </label>
          <input 
            placeholder="0" 
            type="number" 
            onChange={(i) => setFakeNFTTokenId(i.target.value)} 
          />
          <button className={styles.button2} onClick={createDaoProposal}>
            Create Proposal
          </button>
        </div>
      );
    }
  }

  function renderViewProposalsTab() {
    if(loading) {
      return(
        <div className={styles.description}>
          Loading... Waiting for transaction...
        </div>
      );
    } else if(daoProposals.length === 0) {
      return(
        <div className={styles.description}>
          No proposals have been created!
        </div>
      );
    } else {
      return (
        <div>
          {daoProposals.map((p, index) => {
            <div key={index} className={styles.proposalCard}>
              <p>Proposal ID: {p.proposalId}</p>
              <p>Fake NFT to Purchase: {p.nftTokenId}</p>
              <p>Deadline: {p.deadline.toLocaleString()}</p>
              <p>Yay Votes: {p.yesVotes}</p>
              <p>Nay Votes: {p.noVotes}</p>
              <p>Executed?: {p.executed.toString()}</p>
              {p.deadline.getTime() > Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button
                    className={styles.button2}
                    onClick={() => voteOnProposal(p.proposalId, "Yes")}
                  >
                    Vote Yes
                  </button>
                  <button
                    className={styles.button2}
                    onClick={() => voteOnProposal(p.proposalId, "No")}
                  >
                    Vote No
                  </button>
                </div>
              ) : p.deadline.getTime() < Date.now() && !p.executed ? (
                <div className={styles.flex}>
                  <button
                    className={styles.button2}
                    onClick={() => executeProposal(p.proposalId)}
                  >
                    Execute Proposal{" "}
                    {p.yesVotes > p.noVotes ? "(Yes)" : "(No)"}
                  </button>
                </div>
              ) : (
                <div className={styles.description}>Proposal Executed</div>
              )}
            </div>
    })}
        </div>
      );
    }
  }

  return (
    <div>
      <Head>
        <title>CryptoDevs DAO</title>
        <meta name="description" content="CryptoDevs DAO" />
        <link rel="icon" href="./favicon.ico" />
      </Head>

      <div className={styles.main}>
            <div>
                <div>
                    <h1 className={styles.title}>Welcome to CryptoDevs</h1>
                    <p className={styles.description}>Welcome to the DAO!</p>
                    <div className={styles.description}>
                        Your CryptoDevs NFT Balance: {userNFTBalance}
                        <br />
                        Treasury Balance: {formatEther(treasuryBalance)} ETH
                        <br />
                        Total Number of Proposals: {numOfProposalsInDAO}
                    </div>
                </div>
                <div className={styles.flex}>
                    <button 
                        className={styles.button}
                        onClick={() => setSelectedTab("Create Proposal")}
                    >
                        Create Proposal
                    </button>
                    <button 
                        className={styles.button} 
                        onClick={() => setSelectedTab("View Proposals")}
                    >
                        View Proposals
                    </button>
                </div>
                {renderTabs()}
            </div>
            <div>
                <img className={styles.image} src="./0.svg" />
            </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs!
      </footer>
    </div>
  );
}