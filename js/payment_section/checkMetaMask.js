/* ============================  checkMetaMask.js  ============================ */
document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);

  function showModal({ title, message, actionLabel, actionUrl }) {
    $('popupTitle').textContent  = title;
    $('popupMessage').innerHTML  = message;
    const btn = $('popupAction');
    btn.textContent = actionLabel;
    btn.onclick     = () => {
      window.open(actionUrl, '_blank');
      hideModal();
    };
    $('overlay').classList.remove('hidden');
    document.body.classList.add('modal-open');
  }

  function hideModal() {
    $('overlay').classList.add('hidden');
    document.body.classList.remove('modal-open');
  }

  /** Определяет, что человек в встроенном браузере Trust Wallet */
  function isTrustWalletBrowser() {
    return /trust/i.test(navigator.userAgent);
  }

  /** Вернёт `true`, если MetaMask установлен ИЛИ Trust Wallet, иначе покажет поп-ап и вернёт `false` */
  async function checkMetaMaskInstalled() {
    const hasMetaMask = window.ethereum && window.ethereum.isMetaMask;
    const isTrust     = isTrustWalletBrowser();

    if (hasMetaMask || isTrust) return true;

    showModal({
      title: 'MetaMask not found',
      message: 'To make a donation, please install the MetaMask extension and reconnect.',
      actionLabel: 'Install MetaMask',
      actionUrl:   'https://metamask.io/download/'
    });
    return false;
  }

  // Экспорт в глобал
  window.checkMetaMaskInstalled = checkMetaMaskInstalled;
});
