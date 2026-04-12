"use server"

/**
 * Server Actions for Profile Links
 * 
 * CRUD operations for the profile_links table.
 * Supports multiple links per type (e.g., multiple GitHub repos).
 */

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// ============================================================================
// TYPES
// ============================================================================

export type LinkType = "linkedin" | "github" | "portfolio" | "website" | "other"
export type ParseStatus = "pending" | "parsed" | "failed" | "skipped"

export interface ProfileLink {
  id: string
  user_id: string
  link_type: LinkType
  url: string
  label: string | null
  is_primary: boolean
  source: string
  parse_status: ParseStatus
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface AddLinkInput {
  link_type: LinkType
  url: string
  label?: string
  is_primary?: boolean
}

export interface UpdateLinkInput {
  id: string
  url?: string
  label?: string
  link_type?: LinkType
}

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Get all profile links for the current user
 */
export async function getProfileLinks(linkType?: LinkType): Promise<{
  success: boolean
  links: ProfileLink[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, links: [], error: "Not authenticated" }
    }

    let query = supabase
      .from("user_profile_links")
      .select("*")
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })

    if (linkType) {
      query = query.eq("link_type", linkType)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching profile links:", error)
      return { success: false, links: [], error: error.message }
    }

    return { success: true, links: data || [] }
  } catch (err) {
    console.error("Exception fetching profile links:", err)
    return { success: false, links: [], error: "Failed to fetch links" }
  }
}

/**
 * Add a new profile link
 */
export async function addProfileLink(input: AddLinkInput): Promise<{
  success: boolean
  link?: ProfileLink
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // Validate URL
    if (!input.url || !isValidUrl(input.url)) {
      return { success: false, error: "Invalid URL format" }
    }

    const { data, error } = await supabase
      .from("user_profile_links")
      .insert({
        user_id: user.id,
        link_type: input.link_type,
        url: input.url.trim(),
        label: input.label?.trim() || null,
        is_primary: input.is_primary ?? false,
        source: "user_input",
        parse_status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Error adding profile link:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/profile")
    return { success: true, link: data }
  } catch (err) {
    console.error("Exception adding profile link:", err)
    return { success: false, error: "Failed to add link" }
  }
}

/**
 * Update an existing profile link
 */
export async function updateProfileLink(input: UpdateLinkInput): Promise<{
  success: boolean
  link?: ProfileLink
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // Validate URL if provided
    if (input.url && !isValidUrl(input.url)) {
      return { success: false, error: "Invalid URL format" }
    }

    const updateData: Partial<ProfileLink> = {}
    if (input.url !== undefined) updateData.url = input.url.trim()
    if (input.label !== undefined) updateData.label = input.label.trim() || null
    if (input.link_type !== undefined) updateData.link_type = input.link_type

    const { data, error } = await supabase
      .from("user_profile_links")
      .update(updateData)
      .eq("id", input.id)
      .eq("user_id", user.id) // Security: only update own links
      .select()
      .single()

    if (error) {
      console.error("Error updating profile link:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/profile")
    return { success: true, link: data }
  } catch (err) {
    console.error("Exception updating profile link:", err)
    return { success: false, error: "Failed to update link" }
  }
}

/**
 * Remove a profile link
 */
export async function removeProfileLink(id: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const { error } = await supabase
      .from("user_profile_links")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id) // Security: only delete own links

    if (error) {
      console.error("Error removing profile link:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/profile")
    return { success: true }
  } catch (err) {
    console.error("Exception removing profile link:", err)
    return { success: false, error: "Failed to remove link" }
  }
}

/**
 * Set a link as the primary link for its type
 */
export async function setPrimaryLink(id: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    // The database trigger will handle unsetting other primary links
    const { error } = await supabase
      .from("user_profile_links")
      .update({ is_primary: true })
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error setting primary link:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/profile")
    return { success: true }
  } catch (err) {
    console.error("Exception setting primary link:", err)
    return { success: false, error: "Failed to set primary link" }
  }
}

/**
 * Migrate legacy links from user_profile.links to profile_links table
 */
export async function migrateLegacyLinks(): Promise<{
  success: boolean
  migratedCount: number
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, migratedCount: 0, error: "Not authenticated" }
    }

    // Get existing profile with legacy links
    const { data: profile } = await supabase
      .from("user_profile")
      .select("links, linkedin_url, github_url, website_url")
      .eq("user_id", user.id)
      .single()

    if (!profile) {
      return { success: true, migratedCount: 0 }
    }

    const linksToInsert: Omit<ProfileLink, "id" | "created_at" | "updated_at">[] = []

    // Migrate individual URL fields
    if (profile.linkedin_url) {
      linksToInsert.push({
        user_id: user.id,
        link_type: "linkedin",
        url: profile.linkedin_url,
        label: null,
        is_primary: true,
        source: "migrated_from_profile",
        parse_status: "pending",
        metadata: null,
      })
    }

    if (profile.github_url) {
      linksToInsert.push({
        user_id: user.id,
        link_type: "github",
        url: profile.github_url,
        label: null,
        is_primary: true,
        source: "migrated_from_profile",
        parse_status: "pending",
        metadata: null,
      })
    }

    if (profile.website_url) {
      linksToInsert.push({
        user_id: user.id,
        link_type: "website",
        url: profile.website_url,
        label: null,
        is_primary: true,
        source: "migrated_from_profile",
        parse_status: "pending",
        metadata: null,
      })
    }

    // Migrate from links jsonb if it exists
    if (profile.links && typeof profile.links === "object") {
      const legacyLinks = profile.links as Record<string, string>
      for (const [type, url] of Object.entries(legacyLinks)) {
        if (url && isValidUrl(url)) {
          const linkType = mapLegacyLinkType(type)
          // Check if we already have this link type from individual fields
          if (!linksToInsert.some(l => l.link_type === linkType && l.url === url)) {
            linksToInsert.push({
              user_id: user.id,
              link_type: linkType,
              url,
              label: null,
              is_primary: !linksToInsert.some(l => l.link_type === linkType),
              source: "migrated_from_links_jsonb",
              parse_status: "pending",
              metadata: null,
            })
          }
        }
      }
    }

    if (linksToInsert.length === 0) {
      return { success: true, migratedCount: 0 }
    }

    // Check for existing links to avoid duplicates
    const { data: existingLinks } = await supabase
      .from("user_profile_links")
      .select("url")
      .eq("user_id", user.id)

    const existingUrls = new Set(existingLinks?.map(l => l.url) || [])
    const newLinks = linksToInsert.filter(l => !existingUrls.has(l.url))

    if (newLinks.length === 0) {
      return { success: true, migratedCount: 0 }
    }

    const { error } = await supabase
      .from("user_profile_links")
      .insert(newLinks)

    if (error) {
      console.error("Error migrating links:", error)
      return { success: false, migratedCount: 0, error: error.message }
    }

    revalidatePath("/profile")
    return { success: true, migratedCount: newLinks.length }
  } catch (err) {
    console.error("Exception migrating links:", err)
    return { success: false, migratedCount: 0, error: "Failed to migrate links" }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

function mapLegacyLinkType(type: string): LinkType {
  const normalizedType = type.toLowerCase()
  if (normalizedType.includes("linkedin")) return "linkedin"
  if (normalizedType.includes("github")) return "github"
  if (normalizedType.includes("portfolio")) return "portfolio"
  if (normalizedType.includes("website") || normalizedType.includes("web")) return "website"
  return "other"
}
