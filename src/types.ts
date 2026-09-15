export type ContentType = "course" | "guide" | "template";

export type ContentStatus = "live" | "suspended" | "delisted";

export type PurchaseStatus = "pending" | "confirmed" | "failed";

export type BountyState =
  | "funding"
  | "open"
  | "review"
  | "payout_pending"
  | "paid"
  | "disputed"
  | "refunded"
  | "cancelled";

export type SubmissionStatus = "submitted" | "winner" | "not_selected" | "withdrawn";

export type Profile = {
  wallet: string;
  username: string;
  displayName: string;
  bio: string;
  createdAt: number;
  purchased: number;
  published: number;
  submitted: number;
  won: number;
  earnedLuna: number;
};

export type ContentCard = {
  id: string;
  creatorWallet: string;
  creatorUsername: string;
  type: ContentType;
  title: string;
  description: string;
  category: string;
  priceLuna: number;
  preview: string;
  status: ContentStatus;
  createdAt: number;
  ratingAvg: number;
  ratingCount: number;
  owned: boolean;
  saved: boolean;
  fileId: string | null;
};

export type ContentDetail = ContentCard & {
  body: string | null;
  fileName: string | null;
  fileMime: string | null;
};

export type BountyCard = {
  id: string;
  sponsorWallet: string;
  sponsorUsername: string;
  title: string;
  brief: string;
  category: string;
  deliverables: string;
  winnerCount: number;
  rewardLuna: number;
  deadline: number;
  state: BountyState;
  funded: boolean;
  fundTx: string | null;
  createdAt: number;
  submissionCount: number;
  saved: boolean;
};

export type Submission = {
  id: string;
  bountyId: string;
  submitterWallet: string;
  submitterUsername: string;
  assetUrl: string;
  fileId: string | null;
  note: string;
  status: SubmissionStatus;
  createdAt: number;
};

export type SaleRow = {
  id: string;
  title: string;
  status: ContentStatus;
  buyers: number;
  revenueLuna: number;
  ratingAvg: number;
  ratingCount: number;
};

export type PayoutRow = {
  id: string;
  wallet: string;
  amountLuna: number;
  status: string;
  memo: string;
};

export type StallStats = {
  uniqueWallets: number;
  purchases: number;
  listings: number;
  submissions: number;
  payouts: number;
};

export type Session = {
  wallet: string;
  username: string | null;
  demo: boolean;
};
