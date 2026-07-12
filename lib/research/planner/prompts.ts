/**
 * Planner Agent Prompts
 *
 * Reusable prompt templates for the Planner Agent.
 * Separated from implementation to keep prompts maintainable and testable.
 */

/**
 * System prompt for query analysis
 */
export const ANALYZE_QUERY_SYSTEM_PROMPT = `You are an expert query analyzer. Your job is to understand what the user is really asking for.

Analyze the user's query and determine:
1. What is the user's intent? (informational, explanatory, analytical, instructional, creative, or decision support)
2. What are the main topics/entities being discussed?
3. What key concepts are involved?
4. How complex is this query? (1=trivial, 5=very complex)
5. Is the query clear and actionable?

Respond in JSON format with fields: intent, mainTopic, entities, concepts, complexity, isActionable`

/**
 * Prompt for generating execution plan
 */
export const GENERATE_PLAN_SYSTEM_PROMPT = `You are an expert execution planner for AI research and analysis tasks.

Given a user query and intent analysis, produce a detailed execution plan that includes:
1. A clear objective statement
2. Decomposed tasks with dependencies
3. Search queries needed
4. Required tools
5. Expected outputs
6. Optimal reasoning strategy
7. Confidence score for the plan

Optimize for:
- Minimal unnecessary steps
- Maximizing parallelism where safe
- Clear data flow between tasks
- Maximum success probability

Respond in JSON format matching the ExecutionPlan interface.`

/**
 * Prompt for intent classification
 */
export const CLASSIFY_INTENT_PROMPT = `Classify the following query into one of these categories:
- INFORMATIONAL: User wants facts or information
- EXPLANATORY: User wants to understand how or why something works
- ANALYTICAL: User wants analysis, comparison, or evaluation
- INSTRUCTIONAL: User wants step-by-step guidance or instructions
- CREATIVE: User wants ideas, suggestions, or creative content
- DECISION_SUPPORT: User wants help deciding between options

Query: \"{query}\"

Respond with only the category name.`

/**
 * Prompt for task decomposition
 */
export const DECOMPOSE_TASKS_PROMPT = `Break down this objective into concrete, measurable tasks:

Objective: \"{objective}\"
Intent: {intent}

For each task, specify:
- What needs to be done
- Why it's needed
- What it depends on (if anything)
- What output it produces
- Priority level

Tasks should be:
- Specific and actionable
- Appropriately granular
- Clearly dependent or independent
- Ordered for optimal execution

Respond as a JSON array of tasks.`

/**
 * Prompt for search query generation
 */
export const GENERATE_SEARCH_QUERIES_PROMPT = `Generate search queries for these research tasks:

Objective: \"{objective}\"
Tasks:
{tasks}

For each task that needs external information, generate 1-3 search queries that would retrieve relevant results.

Search queries should be:
- Specific and focused
- Use proper search syntax when helpful
- Designed to find authoritative sources
- Complementary (cover different angles)

Respond as a JSON array with fields: taskId, query, rationale.`

/**
 * Prompt for tool selection
 */
export const SELECT_TOOLS_PROMPT = `Given this plan, what tools are needed to execute it?

Plan objective: \"{objective}\"
Tasks: {tasks}
Search queries: {searchQueryCount}

Decide which of these tools are required:
- Search (yes/no): Are external searches needed?
- Browser (yes/no): Is webpage retrieval needed?
- Reasoning (yes/no): Is complex reasoning needed?
- Critique (yes/no): Is verification/critique needed?

Respond as JSON with boolean fields.`

/**
 * Prompt for reasoning strategy selection
 */
export const SELECT_STRATEGY_PROMPT = `Given these tasks, what execution strategy is best?

Tasks: {tasks}

Options:
- LINEAR: Execute one after another in order
- PARALLEL: Execute independent tasks simultaneously
- TREE: Branch and explore alternatives
- ADAPTIVE: Adjust strategy based on results

Consider:
- Task dependencies
- Resource constraints
- Time sensitivity
- Uncertainty in results

Respond with the strategy name.`

/**
 * Prompt for confidence scoring
 */
export const SCORE_CONFIDENCE_PROMPT = `Rate your confidence in this plan:

Objective: \"{objective}\"
Tasks: {taskCount} tasks
Searches: {searchCount} searches
Strategy: {strategy}

Factors to consider:
- How clear is the objective?
- Are tasks well-defined and achievable?
- Are search queries likely to find relevant info?
- Are there uncertainties or gaps?
- Is the strategy well-suited to the objective?

Provide a confidence score from 0.0 to 1.0.`
