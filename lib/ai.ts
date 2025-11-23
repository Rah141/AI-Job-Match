import OpenAI from "openai"
import { OPENAI_API_KEY, OPENAI_MODEL } from "@/lib/env"
import { withRetry } from "@/lib/utils"

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
})

const MODEL = OPENAI_MODEL

export async function generateResumeFromProfile(profileData: any) {
  const prompt = `
    Create a professional resume based on the following profile data:
    ${JSON.stringify(profileData, null, 2)}
    
    Return the response in JSON format with the following structure:
    {
      "fullName": "...",
      "contact": { "email": "...", "phone": "...", "location": "...", "links": [...] },
      "summary": "...",
      "experience": [{ "company": "...", "role": "...", "dates": "...", "responsibilities": ["..."] }],
      "education": [{ "institution": "...", "degree": "...", "dates": "..." }],
      "skills": ["..."]
    }
  `

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: MODEL,
    response_format: { type: "json_object" },
  })

  return JSON.parse(completion.choices[0].message.content || "{}")
}

import { ParsedResume } from "@/lib/openai/parseResume"

export async function scoreJobsForResume(resume: ParsedResume | string, jobs: any[]) {
  if (!jobs || jobs.length === 0) {
    console.warn("scoreJobsForResume: No jobs provided to score")
    return []
  }

  let resumeData: ParsedResume
  let resumeText = ""
  let keywords: string[] = []

  if (typeof resume === "string") {
    resumeText = resume
    console.log("scoreJobsForResume: Using string resume format")
  } else {
    resumeData = resume
    // Extract keywords if available
    keywords = resume.keywords || resume.skills || []
    
    // Convert structured resume to text for AI analysis
    resumeText = `
      Name: ${resume.fullName || "Not provided"}
      Headline: ${resume.headlineOrTitle || ""}
      Summary: ${resume.summary || ""}
      Skills: ${(resume.skills || []).join(", ")}
      Keywords: ${keywords.join(", ")}
      Experience:
      ${(resume.experience || []).map(exp => `${exp.jobTitle || ""} at ${exp.company || ""} (${exp.startDate || ""} - ${exp.endDate || ""}): ${exp.description || ""}`).join("\n")}
      Education:
      ${(resume.education || []).map(edu => `${edu.degree || ""} at ${edu.institution || ""}`).join("\n")}
    `
    console.log(`scoreJobsForResume: Scoring ${jobs.length} jobs against resume for ${resume.fullName || "user"}`)
  }

  // Use AI to score jobs based on resume content and keywords
  const jobDescriptions = jobs.map(job => ({
    id: job.id,
    title: job.title,
    company: job.company,
    description: job.fullDescription || job.shortDescription || "",
  }))

  const prompt = `
    You are a job matching expert. Analyze the following resume and score how well it matches EACH job description.
    You MUST provide a score for EVERY job in the list. Pay special attention to:
    - Keyword matches between resume and job description
    - Skill alignment (technical skills, tools, technologies)
    - Experience relevance (years of experience, industry experience)
    - Education requirements
    - Overall fit and compatibility
    
    Resume:
    ${resumeText}
    
    Jobs to score (you MUST score ALL ${jobs.length} jobs):
    ${JSON.stringify(jobDescriptions, null, 2)}
    
    Return a JSON object with a "scores" array. Each item in the array MUST have:
    - jobId: the exact job ID from the list above
    - score: a number from 0-100 indicating match quality (0 = no match, 100 = perfect match)
    
    IMPORTANT: You must return scores for ALL ${jobs.length} jobs. The "scores" array must contain exactly ${jobs.length} items.
    
    Format: { "scores": [{ "jobId": "...", "score": 85 }, ...] }
  `

  try {
    console.log(`scoreJobsForResume: Calling OpenAI API to score ${jobs.length} jobs`)
    const completion = await withRetry(
      () => openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: MODEL,
        response_format: { type: "json_object" },
      }),
      {
        maxRetries: 3,
        initialDelay: 1000,
        retryable: (error) => {
          if (error && typeof error === "object" && "status" in error) {
            const status = (error as { status: number }).status
            return status === 429 || status >= 500
          }
          return false
        },
      }
    )

    const rawResponse = completion.choices[0].message.content || "{}"
    console.log("scoreJobsForResume: Received response from OpenAI")
    
    let response: any
    try {
      response = JSON.parse(rawResponse)
    } catch (parseError) {
      console.error("scoreJobsForResume: Failed to parse OpenAI response:", parseError)
      throw new Error("Invalid JSON response from OpenAI")
    }
    
    // Extract scores array from response
    let scores: Array<{ jobId: string; score: number }> = []
    if (response.scores && Array.isArray(response.scores)) {
      scores = response.scores
      console.log(`scoreJobsForResume: Found ${scores.length} scores in response.scores array`)
    } else if (Array.isArray(response)) {
      scores = response
      console.log(`scoreJobsForResume: Response is direct array with ${scores.length} items`)
    } else {
      // Fallback: create scores from response object keys
      console.log("scoreJobsForResume: Response is object, extracting scores from keys")
      scores = Object.entries(response).map(([jobId, data]: [string, any]) => ({
        jobId,
        score: typeof data === "number" ? data : (data?.score || 50),
      }))
    }

    // Validate that we have scores for all jobs
    const jobIds = new Set(jobs.map(j => j.id))
    const scoredJobIds = new Set(scores.map(s => s.jobId))
    const missingJobIds = Array.from(jobIds).filter(id => !scoredJobIds.has(id))
    
    if (missingJobIds.length > 0) {
      console.warn(`scoreJobsForResume: Missing scores for ${missingJobIds.length} jobs:`, missingJobIds)
    }

    // Ensure all jobs have scores with validation
    const result = jobs.map(job => {
      const scoreData = scores.find(s => s.jobId === job.id)
      const score = scoreData?.score ?? 50
      
      // Validate score is in valid range
      const validatedScore = Math.max(0, Math.min(100, Math.round(score)))
      
      return {
        jobId: job.id,
        score: validatedScore,
      }
    })

    const scoreRange = result.length > 0 
      ? `${Math.min(...result.map(r => r.score))}-${Math.max(...result.map(r => r.score))}`
      : "N/A"
    console.log(`scoreJobsForResume: ✅ Successfully scored ${result.length} jobs using OpenAI. Score range: ${scoreRange}`)
    
    // Log sample scores for verification
    if (result.length > 0) {
      const sampleScores = result.slice(0, 3).map(r => `Job ${r.jobId.substring(0, 8)}: ${r.score}%`).join(", ")
      console.log(`scoreJobsForResume: Sample scores: ${sampleScores}`)
    }
    
    return result
  } catch (error: any) {
    console.error("scoreJobsForResume: ❌ Error scoring jobs with AI, using keyword-based fallback:", error?.message || error)
    console.warn("scoreJobsForResume: ⚠️  WARNING: Scores are from keyword fallback, NOT OpenAI!")
    
    // Fallback: Improved keyword-based scoring
    console.log("scoreJobsForResume: Using keyword-based fallback scoring")
    const fallbackScores = jobs.map(job => {
      const jobText = `${job.title} ${job.company} ${job.fullDescription || job.shortDescription || ""}`.toLowerCase()
      const keywordMatches = keywords.filter(keyword => 
        keyword && keyword.trim() && jobText.includes(keyword.toLowerCase())
      ).length
      
      const matchPercentage = keywords.length > 0 
        ? Math.min(100, 50 + (keywordMatches / keywords.length) * 50)
        : 50
      
      return {
        jobId: job.id,
        score: Math.round(matchPercentage),
      }
    })
    
    console.warn(`scoreJobsForResume: ⚠️  Generated ${fallbackScores.length} fallback scores (NOT from OpenAI)`)
    return fallbackScores
  }
}

export async function tailorResumeToJob(baseResume: any, jobDescription: string) {
  const prompt = `
    You are an expert resume writer and career strategist. Tailor the provided resume to match the job description by optimizing the content, structure, and emphasis while preserving all original information.
    
    Instructions:
    1. Analyze the job description to identify:
       - Required skills, technologies, and qualifications
       - Key responsibilities and job requirements
       - Preferred experience and education
       - Industry keywords and terminology
    
    2. Optimize the resume by:
       - Reordering work experiences to place the most relevant positions first
       - Rewriting the professional summary to emphasize qualifications that match the job requirements
       - Adjusting experience descriptions to highlight relevant achievements, responsibilities, and skills that align with the job
       - Emphasizing matching skills and keywords from the job description
       - Ensuring all relevant skills are prominently featured
       - Adjusting the headline/title if it would better match the job title
    
    3. Important constraints:
       - Preserve ALL original data (do not remove any experiences, education, or skills)
       - Maintain factual accuracy (do not fabricate experiences or achievements)
       - Keep the same JSON structure as the input resume
       - Only reorder, rephrase, and emphasize - do not add fictional content
       - Ensure dates, company names, and other factual details remain unchanged
    
    4. Return the tailored resume in the exact same JSON structure as the input, with optimized content.
    
    Original Resume:
    ${JSON.stringify(baseResume, null, 2)}
    
    Job Description:
    ${jobDescription}
    
    Return the tailored resume as a JSON object with the same structure as the input resume, but with optimized content that better matches the job requirements.
  `

  const completion = await withRetry(
    () => openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: MODEL,
      response_format: { type: "json_object" },
    }),
    {
      maxRetries: 3,
      initialDelay: 1000,
      retryable: (error) => {
        if (error && typeof error === "object" && "status" in error) {
          const status = (error as { status: number }).status
          return status === 429 || status >= 500
        }
        return false
      },
    }
  )

  return JSON.parse(completion.choices[0].message.content || "{}")
}

export async function generateCoverLetter(userInfo: any, resume: any, jobDescription: string) {
  // Build comprehensive resume summary for the prompt
  const resumeSummary = `
    Candidate Name: ${resume.fullName || userInfo.name || "Candidate"}
    ${resume.headlineOrTitle ? `Professional Title: ${resume.headlineOrTitle}` : ""}
    ${resume.summary ? `Professional Summary: ${resume.summary}` : ""}
    
    Skills: ${(resume.skills || []).join(", ")}
    ${resume.keywords && resume.keywords.length > 0 ? `Keywords: ${resume.keywords.join(", ")}` : ""}
    
    Professional Experience:
    ${(resume.experience || []).map((exp: any, idx: number) => 
      `${idx + 1}. ${exp.jobTitle || "Position"} at ${exp.company || "Company"}${exp.startDate || exp.endDate ? ` (${exp.startDate || ""} - ${exp.endDate || "Present"})` : ""}\n   ${exp.description || ""}`
    ).join("\n\n")}
    
    ${(resume.education || []).length > 0 ? `Education:\n${(resume.education || []).map((edu: any) => 
      `- ${edu.degree || "Degree"} from ${edu.institution || "Institution"}${edu.startDate || edu.endDate ? ` (${edu.startDate || ""} - ${edu.endDate || ""})` : ""}`
    ).join("\n")}` : ""}
    
    ${resume.email ? `Contact: ${resume.email}` : ""}
    ${resume.location ? `Location: ${resume.location}` : ""}
  `.trim()

  const prompt = `
    You are an expert career coach and cover letter writer. Write a compelling, personalized cover letter that demonstrates how the candidate's qualifications align with the job requirements.
    
    Instructions:
    1. Analyze the job description to identify key requirements, responsibilities, and qualifications
    2. Match the candidate's skills, experiences, and achievements from their resume to the job requirements
    3. Reference specific experiences, projects, or accomplishments that demonstrate relevant expertise
    4. Highlight relevant skills and education that align with the job description
    5. Write in a professional, confident, and enthusiastic tone
    6. Keep the letter between 300-400 words
    7. Structure the letter with:
       - Opening paragraph: Express interest and mention the specific position
       - Body paragraphs (2-3): Highlight relevant experience, skills, and achievements that match the job requirements
       - Closing paragraph: Reiterate interest and express eagerness to discuss further
    
    Candidate Information:
    ${resumeSummary}
    
    Job Description:
    ${jobDescription}
    
    Write a professional cover letter that effectively connects the candidate's background to the job requirements. Be specific and reference actual experiences and skills from the resume.
  `

  const completion = await withRetry(
    () => openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: MODEL,
    }),
    {
      maxRetries: 3,
      initialDelay: 1000,
      retryable: (error) => {
        if (error && typeof error === "object" && "status" in error) {
          const status = (error as { status: number }).status
          return status === 429 || status >= 500
        }
        return false
      },
    }
  )

  return completion.choices[0].message.content
}

export async function parseResumeFromText(text: string) {
  const prompt = `
    Extract structured data from the following resume text:
    ${text}
    
    Return the response in JSON format with the following structure:
    {
      "fullName": "...",
      "email": "...",
      "phone": "...",
      "location": "...",
      "headlineOrTitle": "...",
      "summary": "...",
      "experience": [{ "jobTitle": "...", "company": "...", "startDate": "...", "endDate": "...", "description": "..." }],
      "education": [{ "degree": "...", "institution": "...", "startDate": "...", "endDate": "..." }],
      "skills": ["..."],
      "keywords": ["string - important skills, technologies, and keywords for job matching"],
      "links": ["..."]
    }
    
    Important:
    - Extract ALL skills mentioned in the resume
    - In the "keywords" array, include: technical skills, programming languages, frameworks, tools, soft skills, and any other relevant terms that would be useful for matching with job descriptions
    - Keywords should be comprehensive for effective job matching
  `

  const completion = await withRetry(
    () => openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: MODEL,
      response_format: { type: "json_object" },
    }),
    {
      maxRetries: 3,
      initialDelay: 1000,
      retryable: (error) => {
        if (error && typeof error === "object" && "status" in error) {
          const status = (error as { status: number }).status
          return status === 429 || status >= 500
        }
        return false
      },
    }
  )

  const parsed = JSON.parse(completion.choices[0].message.content || "{}")
  
  // Ensure keywords array exists and merge with skills
  if (!Array.isArray(parsed.keywords)) {
    parsed.keywords = parsed.skills || []
  }
  
  // Merge skills into keywords
  const allKeywords = new Set([
    ...(parsed.keywords || []),
    ...(parsed.skills || []),
  ])
  parsed.keywords = Array.from(allKeywords)
  
  return parsed
}
