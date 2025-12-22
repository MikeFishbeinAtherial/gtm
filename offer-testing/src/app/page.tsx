export default function Home() {
  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
        Offer Testing System
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        AI-powered system to test business offers through outbound outreach.
      </p>
      
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          Quick Start
        </h2>
        <p style={{ color: '#666' }}>
          Use the Cursor slash commands to get started:
        </p>
        <ul style={{ marginTop: '1rem', marginLeft: '1.5rem' }}>
          <li><code>/new-offer</code> - Create a new offer</li>
          <li><code>/offer-research</code> - Research the market</li>
          <li><code>/offer-icp</code> - Generate ICP</li>
          <li><code>/offer-copy</code> - Generate outreach copy</li>
          <li><code>/offer-launch</code> - Launch a campaign</li>
          <li><code>/offer-review</code> - Review results</li>
        </ul>
      </section>
      
      <section>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          Status
        </h2>
        <p style={{ color: '#666' }}>
          Dashboard coming soon. For now, use Cursor commands and Supabase directly.
        </p>
      </section>
    </main>
  )
}

