// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Monarchade {

    struct Challenge {
        address brand;
        bytes32 metadataHash;
        uint256 prizePool;
        uint256 deadline;       
        uint256 startTime;      
        uint256 endTime;       
        uint256 winnerCount;
        uint256 scoreCount;
        bool started;
        bool distributed;
        bool exists;
    }

    address public owner;
    address public serverSigner;
    uint256 public platformFeeBps;
    uint256 public challengeCount;
    uint256 public totalEscrowed;

    uint256 public constant MAX_SCORE = 300;
    uint256 public constant REFUND_DELAY = 48 hours;
    uint256 public constant SUBMIT_GRACE = 5 minutes;

    mapping(uint256 => Challenge) public challenges;
    mapping(uint256 => mapping(address => uint256)) public playerScores;
    mapping(uint256 => mapping(address => bool)) public hasPlayed;
    mapping(uint256 => address[]) private _challengePlayers;

    event ChallengeCreated(uint256 indexed challengeId, address indexed brand, bytes32 metadataHash, uint256 prizePool, uint256 deadline, uint256 winnerCount);
    event ChallengeStarted(uint256 indexed challengeId, uint256 startTime, uint256 endTime);
    event ScoreSubmitted(uint256 indexed challengeId, address indexed player, uint256 score, uint256 totalPlayers);
    event RewardsDistributed(uint256 indexed challengeId, address[] winners, uint256[] amounts);
    event ChallengeRefunded(uint256 indexed challengeId, address indexed brand, uint256 amount);
    event ServerSignerUpdated(address indexed oldSigner, address indexed newSigner);

    constructor(address _serverSigner, uint256 _platformFeeBps) {
        require(_serverSigner != address(0), "Zero signer address");
        require(_platformFeeBps <= 1000, "Fee exceeds 10%");
        owner = msg.sender;
        serverSigner = _serverSigner;
        platformFeeBps = _platformFeeBps;
    }

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }
    modifier onlyServerSigner() { require(msg.sender == serverSigner, "Not authorized"); _; }
    modifier challengeExists(uint256 challengeId) { require(challenges[challengeId].exists, "Challenge not found"); _; }

    function createChallenge(
        bytes32 metadataHash,
        uint256 deadline,
        uint256 winnerCount
    ) external payable returns (uint256 challengeId) {
        require(msg.value > 0, "Prize pool required");
        require(deadline > 0 && deadline <= 30 days, "Invalid deadline");
        require(winnerCount > 0 && winnerCount <= 100, "Invalid winner count");

        uint256 fee = (msg.value * platformFeeBps) / 10000;
        uint256 netPrizePool = msg.value - fee;
        challengeId = ++challengeCount;

        challenges[challengeId] = Challenge({
            brand: msg.sender, metadataHash: metadataHash, prizePool: netPrizePool,
            deadline: deadline, startTime: 0, endTime: 0, winnerCount: winnerCount,
            scoreCount: 0, started: false, distributed: false, exists: true
        });
        totalEscrowed += netPrizePool;

        if (fee > 0) {
            (bool ok, ) = owner.call{value: fee}("");
            require(ok, "Fee transfer failed");
        }
        emit ChallengeCreated(challengeId, msg.sender, metadataHash, netPrizePool, deadline, winnerCount);
    }

    function startChallenge(uint256 challengeId) external challengeExists(challengeId) {
        Challenge storage c = challenges[challengeId];
        require(msg.sender == c.brand, "Not the challenge brand");
        require(!c.started, "Already started");
        require(!c.distributed, "Already distributed");

        c.startTime = block.timestamp;
        c.endTime = block.timestamp + c.deadline;
        c.started = true;
        emit ChallengeStarted(challengeId, c.startTime, c.endTime);
    }

    function submitScore(
        uint256 challengeId, address player, uint256 score
    ) external onlyServerSigner challengeExists(challengeId) {
        Challenge storage c = challenges[challengeId];
        require(c.started, "Challenge not started");
        require(block.timestamp >= c.startTime, "Challenge not started yet");
        require(block.timestamp <= c.endTime + SUBMIT_GRACE, "Submission window closed");
        require(!hasPlayed[challengeId][player], "Player already submitted");
        require(player != address(0), "Zero player address");
        require(score <= MAX_SCORE, "Score exceeds maximum");

        hasPlayed[challengeId][player] = true;
        playerScores[challengeId][player] = score;
        _challengePlayers[challengeId].push(player);
        c.scoreCount++;
        emit ScoreSubmitted(challengeId, player, score, c.scoreCount);
    }

    function getChallenge(uint256 challengeId) external view returns (Challenge memory) {
        return challenges[challengeId];
    }
    function getPlayers(uint256 challengeId) external view returns (address[] memory) {
        return _challengePlayers[challengeId];
    }
    function getPlayerScore(uint256 challengeId, address player) external view returns (uint256 score, bool played) {
        return (playerScores[challengeId][player], hasPlayed[challengeId][player]);
    }

    function isActive(uint256 challengeId) external view challengeExists(challengeId) returns (bool) {
        Challenge storage c = challenges[challengeId];
        return c.started && block.timestamp >= c.startTime && block.timestamp <= c.endTime;
    }



    function updateServerSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Zero address");
        emit ServerSignerUpdated(serverSigner, newSigner);
        serverSigner = newSigner;
    }
    function updatePlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee exceeds 10%");
        platformFeeBps = newFeeBps;
    }
    function emergencyWithdraw() external onlyOwner {
        uint256 excess = address(this).balance - totalEscrowed;
        require(excess > 0, "No excess funds");
        (bool ok, ) = owner.call{value: excess}("");
        require(ok, "Withdraw failed");
    }

    receive() external payable {}
}
