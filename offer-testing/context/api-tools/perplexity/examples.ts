/**
 * Perplexity API Examples
 * 
 * Real-world examples of using Perplexity for web search and research.
 */

// ===========================================
// EXAMPLE 1: Research a Company
// ===========================================

export async function researchCompany(companyName: string) {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'pplx-70b-online',
      messages: [
        {
          role: 'user',
          content: `What does ${companyName} do? Include their main products, recent news, and market position.`
        }
      ]
    })
  })

  const data = await response.json()
  return {
    company: companyName,
    summary: data.choices[0]?.message?.content,
    citations: data.citations || []
  }
}

// ===========================================
// EXAMPLE 2: Research a Contact/Person
// ===========================================

export async function researchContact(
  firstName: string,
  lastName: string,
  company?: string
) {
  const query = company
    ? `Find information about ${firstName} ${lastName} at ${company}. Include their role, background, and recent activity.`
    : `Find information about ${firstName} ${lastName}. Include their professional background and current role.`

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'pplx-70b-online',
      messages: [
        {
          role: 'user',
          content: query
        }
      ]
    })
  })

  const data = await response.json()
  return {
    name: `${firstName} ${lastName}`,
    company,
    research: data.choices[0]?.message?.content,
    citations: data.citations || []
  }
}

// ===========================================
// EXAMPLE 3: Find Recent News About a Company
// ===========================================

export async function getCompanyNews(companyName: string, days: number = 30) {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'pplx-70b-online',
      messages: [
        {
          role: 'user',
          content: `Find recent news about ${companyName} from the last ${days} days. Include funding, product launches, partnerships, or major announcements.`
        }
      ]
    })
  })

  const data = await response.json()
  return {
    company: companyName,
    news: data.choices[0]?.message?.content,
    citations: data.citations || [],
    timeframe: `Last ${days} days`
  }
}

// ===========================================
// EXAMPLE 4: Research Industry Trends
// ===========================================

export async function researchIndustryTrends(industry: string) {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'pplx-70b-online',
      messages: [
        {
          role: 'user',
          content: `What are the latest trends and challenges in the ${industry} industry? Include specific examples and data points.`
        }
      ]
    })
  })

  const data = await response.json()
  return {
    industry,
    trends: data.choices[0]?.message?.content,
    citations: data.citations || []
  }
}

// ===========================================
// EXAMPLE 5: Find Companies by Description
// ===========================================

export async function findCompaniesByDescription(description: string) {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'pplx-70b-online',
      messages: [
        {
          role: 'user',
          content: `Find companies that match this description: ${description}. Include company names, websites, and brief descriptions.`
        }
      ]
    })
  })

  const data = await response.json()
  return {
    description,
    companies: data.choices[0]?.message?.content,
    citations: data.citations || []
  }
}

// ===========================================
// EXAMPLE 6: Competitive Research
// ===========================================

export async function researchCompetitor(
  competitorName: string,
  focusAreas?: string[]
) {
  const focus = focusAreas
    ? `Focus on: ${focusAreas.join(', ')}.`
    : ''

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'pplx-70b-online',
      messages: [
        {
          role: 'user',
          content: `Research ${competitorName}. ${focus} Include their main products, pricing, positioning, recent news, and market position.`
        }
      ]
    })
  })

  const data = await response.json()
  return {
    competitor: competitorName,
    research: data.choices[0]?.message?.content,
    citations: data.citations || []
  }
}

// ===========================================
// EXAMPLE 7: Research for Personalization
// ===========================================

export async function getPersonalizationResearch(
  companyName: string,
  contactName?: string
) {
  const queries = [
    `What does ${companyName} do? What are their main products and services?`,
    `What are recent news or developments at ${companyName}?`,
  ]

  if (contactName) {
    queries.push(`Find information about ${contactName} at ${companyName}.`)
  }

  const results = await Promise.all(
    queries.map(async (query) => {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'pplx-7b-online', // Faster/cheaper for bulk research
          messages: [
            {
              role: 'user',
              content: query
            }
          ]
        })
      })
      return response.json()
    })
  )

  return {
    company: companyName,
    contact: contactName,
    companyInfo: results[0].choices[0]?.message?.content,
    recentNews: results[1].choices[0]?.message?.content,
    contactInfo: contactName ? results[2].choices[0]?.message?.content : null,
    allCitations: results.flatMap(r => r.citations || [])
  }
}
