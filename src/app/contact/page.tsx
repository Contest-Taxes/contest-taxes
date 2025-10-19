export default function Page() {
  return (
    <section className="max-w-xl">
      <h1 className="text-3xl font-semibold">Nous joindre</h1>
      <p className="mt-3 text-gray-600">Écrivez-nous et on vous répond rapidement.</p>
      <form className="mt-6 grid gap-4" onSubmit={(e) => e.preventDefault()}>
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
      </form>
    </section>
  );
}
