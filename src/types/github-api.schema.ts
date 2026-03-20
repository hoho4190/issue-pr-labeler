import * as z from 'zod'
import { nullOrEmptyToUndefined } from '../utils/string.utils.js'

// ──────────────────────────────────────────────
// Common structures
// ──────────────────────────────────────────────

const GitHubDefaultBranchRefDataSchema = z.object({
  name: z.string()
})

const GitHubAuthorDataSchema = z.object({
  login: z.string()
})

export const GitHubPageInfoDataSchema = z.object({
  hasNextPage: z.boolean(),
  endCursor: z.string().nullable()
})

export const GitHubPagedNodesSchema = <T extends z.ZodTypeAny>(nodeSchema: T) =>
  z.object({
    pageInfo: GitHubPageInfoDataSchema,
    nodes: z.array(nodeSchema)
  })

export const GitHubLabelsDataSchema = GitHubPagedNodesSchema(z.object({ name: z.string() }))

// ──────────────────────────────────────────────
// Issue schema
// ──────────────────────────────────────────────

export const GitHubIssueDataSchema = z.object({
  defaultBranchRef: GitHubDefaultBranchRefDataSchema,
  issue: z.object({
    author: GitHubAuthorDataSchema,
    title: z.string(),
    body: z
      .string()
      .optional()
      .transform((v) => nullOrEmptyToUndefined(v)),
    labels: GitHubLabelsDataSchema
  })
})

export const GitHubIssueResponseSchema = z.object({
  repository: GitHubIssueDataSchema
})

// ──────────────────────────────────────────────
// Pull request schema
// ──────────────────────────────────────────────

export const GitHubPullRequestDataSchema = z.object({
  defaultBranchRef: GitHubDefaultBranchRefDataSchema,
  pullRequest: z.object({
    author: GitHubAuthorDataSchema,
    title: z.string(),
    body: z
      .string()
      .nullable()
      .optional()
      .transform((v) => nullOrEmptyToUndefined(v)),
    baseRefName: z.string(),
    headRefName: z.string(),
    isDraft: z.boolean(),
    additions: z.number(),
    deletions: z.number(),
    labels: GitHubLabelsDataSchema
  })
})

export const GitHubPullRequestResponseSchema = z.object({
  repository: GitHubPullRequestDataSchema
})

// ──────────────────────────────────────────────
// Content schema
// ──────────────────────────────────────────────

export const GitHubContentResponseSchema = z.object({
  repository: z.object({
    object: z.object({
      text: z.string()
    })
  })
})

// ──────────────────────────────────────────────
// Labels schema
// ──────────────────────────────────────────────

export const GitHubLabelsResponseSchema = z.object({
  repository: z.object({
    labels: GitHubLabelsDataSchema
  })
})

// ──────────────────────────────────────────────
// Pull request files schema
// ──────────────────────────────────────────────

export const GitHubPullRequestFilesResponseSchema = z.object({
  repository: z.object({
    pullRequest: z.object({
      files: GitHubPagedNodesSchema(z.object({ path: z.string() }))
    })
  })
})

// ──────────────────────────────────────────────
// Pull request commits schema
// ──────────────────────────────────────────────

export const GitHubPullRequestCommitDataSchema = z.object({
  message: z.string(),
  messageHeadline: z.string(),
  messageBody: z
    .string()
    .nullable()
    .optional()
    .transform((v) => nullOrEmptyToUndefined(v))
})

export const GitHubPullRequestCommitsResponseSchema = z.object({
  repository: z.object({
    pullRequest: z.object({
      commits: GitHubPagedNodesSchema(
        z.object({
          commit: GitHubPullRequestCommitDataSchema
        })
      )
    })
  })
})

// ──────────────────────────────────────────────
// Issue or Pull request labels schema
// ──────────────────────────────────────────────

export const GitHubIssueOrPullRequestLabelsResponseSchema = z.object({
  repository: z.object({
    issue: z
      .object({
        labels: GitHubLabelsDataSchema
      })
      .optional(),
    pullRequest: z
      .object({
        labels: GitHubLabelsDataSchema
      })
      .optional()
  })
})

// ──────────────────────────────────────────────
// Type inference from schema
// ──────────────────────────────────────────────

export type GitHubLabelsData = z.infer<typeof GitHubLabelsDataSchema>
export type GitHubIssueData = z.infer<typeof GitHubIssueDataSchema>
export type GitHubPullRequestData = z.infer<typeof GitHubPullRequestDataSchema>
export type GitHubPullRequestCommitData = z.infer<typeof GitHubPullRequestCommitDataSchema>
