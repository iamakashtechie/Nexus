==============================
AI PROMPTING GUIDE (STRUCTURED)
==============================

## Core Idea

Prompting is not asking questions.
Prompting is "programming with words".

LLMs are prediction engines:

- Vague prompts → generic answers
- Clear prompts → precise results

Your goal: reduce AI guessing.

---

1. PERSONA (Role Assignment)

---

Define WHO the AI should act as.

Purpose:

- narrows expertise
- improves professional quality
- reduces generic responses

Template:
You are a [ROLE / EXPERT].

Examples:
You are a senior software engineer.
You are a cybersecurity analyst.
You are a professor explaining to beginners.

---

2. CONTEXT (Background Information)

---

Provide all relevant information.

Purpose:

- prevents hallucination
- fills missing knowledge gaps
- aligns AI with your situation

Include:

- background
- goals
- constraints
- audience
- data

Template:
Context:
[Explain the situation in detail]

Example:
Context:
I am building a React notes app for engineering students.
The goal is to help students organize class notes efficiently.

---

3. TASK (Clear Objective)

---

Tell the AI exactly what to do.

Purpose:

- removes ambiguity
- focuses the response

Template:
Task:
[Specific action you want AI to perform]

Examples:
Task:
Explain how APIs work.

Task:
Generate feature ideas.

Task:
Debug this code.

---

4. CONSTRAINTS (Rules & Boundaries)

---

Define limitations for the output.

Examples:

- length limits
- focus areas
- restrictions
- assumptions

Template:
Constraints:

- Keep explanation beginner-friendly
- Avoid technical jargon
- Focus only on frontend solutions
- Do not exceed 200 words

---

5. FORMAT (Output Structure)

---

Specify how the response should look.

This is one of the most powerful prompt upgrades.

Examples:

- bullet list
- table
- JSON
- step-by-step guide
- numbered list

Template:
Format:
Return the answer as:

- 5 bullet points
- each under 30 words

---

6. FEW-SHOT PROMPTING (Examples)

---

Provide examples of desired output.

Purpose:

- guides style
- reduces guessing

Template:
Example 1:
Input:
[example input]

Output:
[example output]

Example 2:
Input:
[example input]

Output:
[example output]

---

7. CHAIN OF THOUGHT (Reasoning)

---

Ask AI to think step-by-step.

Purpose:

- improves accuracy
- improves logical reasoning

Template:
Think step-by-step before giving the final answer.

---

8. TREES OF THOUGHT (Multiple Paths)

---

Ask AI to explore multiple solutions.

Purpose:

- strategic thinking
- better problem solving

Template:
Generate 3 different approaches.
Evaluate each approach.
Then recommend the best solution.

---

9. ADVERSARIAL / PLAYOFF METHOD

---

Use multiple AI personas to critique solutions.

Purpose:

- stronger ideas
- fewer blind spots

Template:
Persona 1: Product manager
Persona 2: Security engineer
Persona 3: Startup investor

Each persona should critique the solution.

---

10. ANTI-HALLUCINATION RULE

---

Prevent AI from guessing.

Template:
If the answer cannot be determined from the provided context,
respond with "I don't know".

---

11. MASTER PROMPT STRUCTURE

---

Use this full template for best results.

Template:

You are a [PERSONA].

Context:
[Background information]

Task:
[What you want the AI to do]

Constraints:
[List any limitations]

Format:
[Specify output structure]

Reasoning:
Think step-by-step before answering.

---

12. EXAMPLE MASTER PROMPT

---

You are a senior software engineer.

Context:
I am building a note-taking app using React for engineering students.

Task:
Suggest features that would make the app useful for students.

Constraints:
Focus on productivity and simplicity.

Format:
Return the answer as a bullet list with short explanations.

Reasoning:
Think step-by-step before answering.

---

13. META SKILL

---

The most important skill in prompting is:

CLARITY OF THOUGHT.

If you cannot clearly describe what you want,
AI cannot generate the correct result.

Prompting improves your thinking,
not the intelligence of the AI.

---

14. BEST PRACTICE

---

Always remember:

Persona

- Context
- Task
- Constraints
- Format
- Reasoning

= High quality output
