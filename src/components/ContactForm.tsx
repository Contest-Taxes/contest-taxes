'use client';
import { FormEvent, useState } from 'react';

export default function ContactForm() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: envoyer à une route API ou un service email
    setSent(true);
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
      <label className="grid gap-1">
        <span>Votre courriel</span>
        <input type="email" required className="rounded-md border p-2" placeholder="vous@exemple.com" />
      </label>
      <label className="grid gap-1">
        <span>Message</span>
        <textarea required className="min-h-[120px] rounded-md border p-2" placeholder="Votre message…" />
      </label>
      <button type="submit" className="rounded-md bg-black px-4 py-2 font-medium text-white hover:opacity-90">
        Envoyer
      </button>

      {sent && <p className="text-sm text-green-700">Merci! On vous revient rapidement.</p>}
    </form>
  );
}