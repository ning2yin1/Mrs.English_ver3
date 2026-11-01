export const COLLECTION_KEY = 'mrsEnglishV3.collection.v1';
export function createOwnershipStore(catalog, storageProvider = () => localStorage) {
  const known = new Set(catalog.cards.map(card => card.id));
  function read() {
    try {
      const raw = storageProvider().getItem(COLLECTION_KEY);
      if (raw === null) return { ledger:{version:1,owned:{}}, error:null };
      const ledger = JSON.parse(raw);
      if (ledger?.version !== 1 || !ledger.owned || typeof ledger.owned !== 'object' || Array.isArray(ledger.owned)) throw new Error('Unsupported collection data');
      return {ledger,error:null};
    } catch (error) { return {ledger:null,error}; }
  }
  return {
    read,
    // Shared ownership boundary for a future Shop; Collection never calls this while viewing.
    awardCard(catalogId, amount = 1, acquiredAt = new Date().toISOString()) {
      if (!known.has(catalogId) || !Number.isSafeInteger(amount) || amount < 1 || typeof acquiredAt !== 'string' || !Number.isFinite(Date.parse(acquiredAt))) throw new Error('Invalid card award');
      const {ledger,error} = read();
      if (error) throw error;
      const previous = ledger.owned[catalogId];
      if (previous && (!Number.isSafeInteger(previous.quantity) || previous.quantity < 1 || typeof previous.firstAcquiredAt !== 'string' || !Number.isFinite(Date.parse(previous.firstAcquiredAt)))) throw new Error('Existing card data needs repair; preserved without overwriting');
      const quantity = (previous?.quantity || 0) + amount;
      if (!Number.isSafeInteger(quantity)) throw new Error('Quantity exceeds supported range');
      ledger.owned[catalogId] = {...previous, quantity, firstAcquiredAt:previous?.firstAcquiredAt || acquiredAt};
      const raw = JSON.stringify(ledger);
      const storage = storageProvider();
      storage.setItem(COLLECTION_KEY,raw);
      if (storage.getItem(COLLECTION_KEY) !== raw) throw new Error('Collection save could not be verified');
      return ledger.owned[catalogId];
    },
  };
}
export function ownedCards(catalog, ledger) {
  return catalog.cards.filter(card => Number.isSafeInteger(ledger?.owned?.[card.id]?.quantity) && ledger.owned[card.id].quantity > 0)
    .map(card => ({...card,quantity:ledger.owned[card.id].quantity,firstAcquiredAt:ledger.owned[card.id].firstAcquiredAt}))
    .sort((a,b) => {
      const date = value => Number.isFinite(Date.parse(value)) ? Date.parse(value) : Infinity;
      const difference = date(a.firstAcquiredAt)-date(b.firstAcquiredAt);
      return (Number.isNaN(difference) ? 0 : difference) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    });
}
export function acquiredDate(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return '—';
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
  return ['year','month','day'].map(type => parts.find(part=>part.type===type).value).join('.');
}
