// A tiny demo contract baked into PortalHouse for one-click EVM deploys on the
// Portaldot V3 testnet. Compiled with solc 0.8.28 (optimizer, 200 runs).
// The constructor takes a single number (initialCount) — the only figure the
// user edits before deploying. After deploy, increment() / setCount() mutate it.

export const DEMO_CONTRACT = {
  name: 'PortalHouseCounter',
  compiler: 'solc 0.8.28',
  // Solidity shown in the UI so the user can see exactly what they're deploying.
  source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract PortalHouseCounter {
    uint256 public count;
    address public immutable deployer;

    event CountChanged(uint256 newCount);

    constructor(uint256 initialCount) {
        count = initialCount;
        deployer = msg.sender;
    }

    function increment() external {
        count += 1;
        emit CountChanged(count);
    }

    function setCount(uint256 newCount) external {
        count = newCount;
        emit CountChanged(newCount);
    }
}`,
  abi: [{"inputs":[{"internalType":"uint256","name":"initialCount","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newCount","type":"uint256"}],"name":"CountChanged","type":"event"},{"inputs":[],"name":"count","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"deployer","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"increment","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newCount","type":"uint256"}],"name":"setCount","outputs":[],"stateMutability":"nonpayable","type":"function"}],
  // Creation bytecode. Constructor args (one uint256) are appended at deploy time.
  bytecode: '0x60a0604052348015600e575f5ffd5b50604051610220380380610220833981016040819052602b916035565b5f5533608052604b565b5f602082840312156044575f5ffd5b5051919050565b6080516101be6100625f395f608b01526101be5ff3fe608060405234801561000f575f5ffd5b506004361061004a575f3560e01c806306661abd1461004e578063d09de08a14610069578063d14e62b814610073578063d5f3948814610086575b5f5ffd5b6100565f5481565b6040519081526020015b60405180910390f35b6100716100c5565b005b61007161008136600461014c565b610112565b6100ad7f000000000000000000000000000000000000000000000000000000000000000081565b6040516001600160a01b039091168152602001610060565b60015f5f8282546100d69190610163565b90915550505f546040519081527f0ef4482aceb854636f33f9cd319f9e1cd6fe3aa2e60523f3583c287b893824459060200160405180910390a1565b5f8190556040518181527f0ef4482aceb854636f33f9cd319f9e1cd6fe3aa2e60523f3583c287b893824459060200160405180910390a150565b5f6020828403121561015c575f5ffd5b5035919050565b8082018082111561018257634e487b7160e01b5f52601160045260245ffd5b9291505056fea264697066735822122001e63901f11373731899e924feaab3d769ac46be722d32f5a1e1f37b470fc5d164736f6c634300081c0033',
}
