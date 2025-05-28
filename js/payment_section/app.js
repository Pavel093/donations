/* ============================  app.js  ============================ */
/* -------- CONFIG -------- */
const CONTRACT_ADDRESS = "0x7887BdA9fBcE978FB4aD78e3Ef0C214104a9A224";

/* -------- ABI -------- (усечён для читаемости; реальный полный оставить!) */
const ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "apostle", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "ApostleCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "donor", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "DonationReceived",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "referrer", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "donor", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "ReferralPayout",
    "type": "event"
  },
  {
    "inputs": [{ "internalType": "address", "name": "referrer", "type": "address" }],
    "name": "donate",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "donateAgain",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "founder",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "hasJoined",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "isApostle",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "minDonation",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "referrerOf",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "newMin", "type": "uint256" }],
    "name": "setMinDonation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "togglePause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "newOwner", "type": "address" }],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];


const MIN_DONATION  = 0.01;                   // BNB
const SITE_URL      = "https://goapostle.com"; // поменяй на домен
const CONNECT_LABEL = "1.&nbsp;Connect&nbsp;Wallet";  // исходная подпись кнопки Connect

/* -------- DOM -------- */
const $ = id => document.getElementById(id);
const btnConnect      = $("btnConnect");
const btnDisconnect   = $("btnDisconnect");
const step2           = $("step2");
const inputAmt        = $("amount");
const quickBtns       = document.querySelectorAll(".quick");
const btnDonate       = $("btnDonate");
const btnDonateAgain  = $("btnDonateAgain");
const btnCopy         = $("btnCopy");
const alertBox        = $("alert");
const refMsg          = $("refMsg");

/* -------- STATE ------- */
let provider, signer, contract, userAddr;

/* -------- HELPERS ----- */
function showAlert(msg, ok = true) {
  alertBox.textContent = msg;
  alertBox.className = ok
    ? "mt-6 p-4 rounded bg-green-100 text-green-800"
    : "mt-6 p-4 rounded bg-red-100 text-red-800";
  alertBox.classList.remove("hidden");
  setTimeout(() => alertBox.classList.add("hidden"), 5000);
}

// Нормализуем ошибки в «человеческие»
function humanError(err) {
  if (err.code === 'INSUFFICIENT_FUNDS' || /insufficient funds/i.test(err.message))
    return 'You do not have enough BNB to make a donation.';
  if (err.code === 'CALL_EXCEPTION')
    return 'Transaction declined: check amount and network.';
  if (err.code === 4001) // пользователь нажал "Reject"
    return 'Транзакция отменена пользователем.';
  return err.reason || err.message || 'Unknown error 😕';
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = 0;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}
const amtBNB = () => parseFloat(inputAmt.value || "0");

/* -------- Благодарность ----- */
function showGratitude() {
  refMsg.classList.remove("hidden");
}

/* -------- WEB3 FLOW --- */
async function connect() {
  if (!window.ethereum)
    

// --- новый pre-flight ---
if (!(await checkMetaMaskInstalled())) return; // модалка «установите MetaMask»
if (!(await ensureBSC())) return;              // модалка «переключитесь на BSC»

  provider = new ethers.BrowserProvider(window.ethereum);
  signer   = await provider.getSigner();
  userAddr = await signer.getAddress();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  btnConnect.textContent = `${userAddr.slice(0, 6)}…${userAddr.slice(-4)}`;
  btnConnect.disabled = true;
  step2.classList.remove("hidden");

  // теперь кнопка Disconnect покажется только после успешного connect()
  btnDisconnect.classList.remove("hidden");

  const joined = await contract.hasJoined(userAddr);
  if (joined) {
    btnDonate.classList.add("hidden");
    btnDonateAgain.classList.remove("hidden");
    btnCopy.classList.remove("hidden");
    showGratitude();
  }

  const refLink = `${SITE_URL}?ref=${userAddr}`;
  btnCopy.onclick = async () => {
    await copy(refLink);
    showAlert("Referral link copied!");
  };
}

async function donate(first = true) {
  if (amtBNB() < MIN_DONATION)
    return showAlert(`Minimum donation — ${MIN_DONATION} BNB`, false);

  const ref      = new URLSearchParams(location.search).get("ref") || ethers.ZeroAddress;
  const valueWei = ethers.parseEther(amtBNB().toString());

  try {
    // мгновенная проверка баланса
    const balanceWei = await provider.getBalance(userAddr);
	
	
    // запас на газ (0.0005 BNB)
	const gasReserveWei = ethers.parseEther("0.0005");
	
	if (balanceWei < valueWei + gasReserveWei)
    return showAlert('You do not have enough BNB to cover the donation plus network fee.', false);

    const tx = first
      ? await contract.donate(ref,   { value: valueWei })
      : await contract.donateAgain(  { value: valueWei });

    showAlert("Transaction sent…");
    await tx.wait();
    showAlert("Thank you! Transaction confirmed.");

    btnDonate.classList.add("hidden");
    btnDonateAgain.classList.remove("hidden");
    btnCopy.classList.remove("hidden");
    showGratitude();
  } catch (err) {
    console.error(err);
    showAlert(humanError(err), false);
  }
}

/* -------- EVENTS ------ */
btnConnect.onclick     = connect;
inputAmt.oninput       = () => (btnDonate.disabled = amtBNB() < MIN_DONATION);
btnDonate.onclick      = () => donate(true);
btnDonateAgain.onclick = () => donate(false);
quickBtns.forEach(btn => {
  btn.onclick = () => {
    inputAmt.value = btn.textContent;
    btnDonate.disabled = false;
  };
});

/* -------- DISCONNECT LOGIC -------- */
function disconnect() {
  // Сброс состояния
  provider = signer = contract = userAddr = null;

  // Скрываем элементы интерфейса
  step2.classList.add("hidden");
  btnDonate.classList.remove("hidden");   // вернём обычную Donate-кнопку
  btnDonateAgain.classList.add("hidden");
  btnCopy.classList.add("hidden");
  refMsg.classList.add("hidden");
  alertBox.classList.add("hidden");

  // Восстановление кнопки Connect
  btnConnect.innerHTML = CONNECT_LABEL;   // важно: innerHTML, чтобы &nbsp; остались пробелами
  btnConnect.disabled  = false;

  // Прячем Disconnect
  btnDisconnect.classList.add("hidden");

  // Очистка поля ввода
  inputAmt.value = "";
}

btnDisconnect.onclick = disconnect;
