/**
 * Filter out raw tool call XML from LLM responses.
 * LLaMA models sometimes output tool calls as visible XML instead of executing them.
 */
export function filterToolCallsFromContent(content: string): string {
  if (!content) return ""
  
  return content
    // Filter out <function(name>...</function> patterns
    .replace(/<function\([^)]*\)[^>]*>[\s\S]*?<\/function>/gi, "")
    // Filter out <tool_call>...</tool_call> patterns
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "")
    // Filter out <function_call>...</function_call> patterns
    .replace(/<function_call>[\s\S]*?<\/function_call>/gi, "")
    // Clean up excessive whitespace
    .replace(/\s{3,}/g, "\n\n")
    .trim()
}
