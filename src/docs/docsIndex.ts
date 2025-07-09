export interface DocNode {
  label: string;
  slug: string;
  children?: DocNode[];
  file?: string;
}

export const docsIndex: DocNode[] = [
  {
    label: "Getting Started",
    slug: "getting-started-category",
    children: [
      {
        label: "Overview",
        slug: "getting-started",
        file: "getting-started.md",
      },
    ],
  },
  {
    label: "Website Management",
    slug: "website-management-category",
    children: [
      {
        label: "Dashboard",
        slug: "dashboard",
        file: "dashboard.md",
      },
      {
        label: "Website Builder",
        slug: "website-builder",
        file: "website-builder.md",
      },
      {
        label: "Templates",
        slug: "templates",
        file: "templates.md",
      },
      {
        label: "Website Viewer",
        slug: "website-viewer",
        file: "website-viewer.md",
      },
    ],
  },
  {
    label: "Visual Javascript Editor",
    slug: "visual-editor",
    children: [
      {
        label: "Overview",
        slug: "visual-editor-overview",
        file: "overview.md",
      },
      {
        label: "Blocks",
        slug: "visual-editor-blocks",
        file: "blocks.md",
      },
      {
        label: "Custom JavaScript",
        slug: "visual-editor-custom-js",
        file: "custom-js.md",
      },
      {
        label: "Moving & Arranging Blocks",
        slug: "visual-editor-moving-blocks",
        file: "moving-blocks.md",
      },
      {
        label: "Collaboration in Visual Editor",
        slug: "visual-editor-collaboration",
        file: "collaboration.md",
      },
    ],
  },
  {
    label: "Collaboration",
    slug: "collaboration-category",
    children: [
      {
        label: "Collaboration Overview",
        slug: "collaboration",
        file: "collaboration.md",
      },
    ],
  },
  {
    label: "User & Tokens",
    slug: "user-tokens-category",
    children: [
      {
        label: "Authentication & User Management",
        slug: "authentication",
        file: "authentication.md",
      },
      {
        label: "Payment & Tokens",
        slug: "payment-tokens",
        file: "payment-tokens.md",
      },
      {
        label: "Referral System",
        slug: "referral",
        file: "referral.md",
      },
    ],
  },
];
