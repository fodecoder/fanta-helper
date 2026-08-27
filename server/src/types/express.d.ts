// Id dell'utente autenticato, impostato da requireAuth dopo aver verificato
// il cookie di sessione firmato.
declare namespace Express {
  interface Request {
    userId?: number;
  }
}
