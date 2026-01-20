// Verification Module Components
// Used by ContentManager and SiteSuperAdmin roles

export { VerificationStatsCards } from "./VerificationStatsCards";
export { VerificationTaskCard } from "./VerificationTaskCard";
export { VerificationStickyFooter } from "./VerificationStickyFooter";
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

// Clinical Operator UI - Zero Scroll Layout (2025)
export { VerificationEditorPanel } from "./VerificationEditorPanel";
export { VerificationStickyHeader } from "./VerificationStickyHeader";
export { ProgressionChain } from "./ProgressionChain";
export { ClinicalMacrosBar } from "./ClinicalMacrosBar";
export { MasterVideoPlayer } from "./MasterVideoPlayer";

// Training Design System - Engineering Grade (2025)
export { AIAnalysisHeader } from "./AIAnalysisHeader";
export { TrainingParametersGrid } from "./TrainingParametersGrid";
export { DualDescriptionTabs } from "./DualDescriptionTabs";
export { QualityChecklist } from "./QualityChecklist";
export type { QualityChecks } from "./QualityChecklist";
export { QualityGateBar } from "./QualityGateBar";

// Legacy (deprecated - use MasterVideoPlayer instead)
export { MobileSimulator } from "./MobileSimulator";