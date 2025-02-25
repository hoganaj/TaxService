export function isValidTransaction(transaction: any): boolean {
  if (!transaction.eventType || !transaction.date || !isValidDate(transaction.date)) {
    return false;
  }
  
  if (transaction.eventType === 'SALES') {
    return Boolean(
      transaction.invoiceId && 
      Array.isArray(transaction.items) && 
      transaction.items.every((item: any) => 
        item.itemId && 
        typeof item.cost === 'number' && 
        typeof item.taxRate === 'number'
      )
    );
  } else if (transaction.eventType === 'TAX_PAYMENT') {
    return typeof transaction.amount === 'number';
  }
  
  return false;
}

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}