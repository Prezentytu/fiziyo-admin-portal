// Verification Module Components
// Used by ContentManager and SiteSuperAdmin roles

export { VerificationStatsCards } from "./VerificationStatsCards";
export { VerificationTaskCard } from "./VerificationTaskCard";
export { VerificationStickyFooter } from "./VerificationStickyFooter";
export { MobileSimulator } from "./MobileSimulator";
export { QualityChecklist } from "./QualityChecklist";
export { TagRefinementPanel } from "./TagRefinementPanel";
export { RejectReasonDialog } from "./RejectReasonDialog";
export { ApproveDialog } from "./ApproveDialog";
export { ReviewerAchievements } from "./ReviewerAchievements";
export { VerificationIntro } from "./VerificationIntro";
export { ExerciseDetailsEditor } from "./ExerciseDetailsEditor";

// New Inline Editing Components
export { InlineEditField, InlineEditSelect } from "./InlineEditField";
export { ClickableStat, ClickableStatGroup, StatBadge } from "./ClickableStat";
export { ExerciseDetailsPanel } from "./ExerciseDetailsPanel";
export { TagSmartChips, TagSmartChipsReadOnly } from "./TagSmartChips";
export { InlineDescription } from "./InlineDescription";
export { VerificationStickyFooterV2 } from "./VerificationStickyFooterV2";
export { ChangesSummary, ChangesSummaryCompact, useChangeTracking } from "./ChangesSummary";
export type { FieldChange } from "./ChangesSummary";
export { PublishGuardrails, useExerciseValidation } from "./PublishGuardrails";
export type { ValidationRule, ValidationResult } from "./PublishGuardrails";

// Relationship Management (Knowledge Graph)
export { RelationSlot } from "./RelationSlot";
export { ExerciseSearchPopover, ExerciseSearchDialog } from "./ExerciseSearchPopover";
export { RelationshipManager, useExerciseRelationships, getRelationsForApprove } from "./RelationshipManager";
