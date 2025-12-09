"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useUser } from "@clerk/nextjs";
import { Plus, Tag, FolderOpen } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchInput } from "@/components/shared/SearchInput";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TagCard, CategoryCard, ExerciseTag, TagCategory } from "@/components/exercises/TagCard";
import { TagDialog } from "@/components/exercises/TagDialog";

import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from "@/graphql/queries/exerciseTags.queries";
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from "@/graphql/queries/tagCategories.queries";
import { DELETE_TAG_MUTATION, DELETE_TAG_CATEGORY_MUTATION } from "@/graphql/mutations/exercises.mutations";
import { GET_USER_BY_CLERK_ID_QUERY } from "@/graphql/queries/users.queries";
import { matchesSearchQuery } from "@/utils/textUtils";
import type { UserByClerkIdResponse, ExerciseTagsResponse, TagCategoriesResponse } from "@/types/apollo";

export default function TagsPage() {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"tags" | "categories">("tags");
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<ExerciseTag | null>(null);
  const [deletingTag, setDeletingTag] = useState<ExerciseTag | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<TagCategory | null>(null);

  // Get user data
  const { data: userData } = useQuery(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: user?.id },
    skip: !user?.id,
  });

  const organizationId = (userData as UserByClerkIdResponse)?.userByClerkId?.organizationIds?.[0];

  // Get tags
  const { data: tagsData, loading: tagsLoading } = useQuery(
    GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY,
    {
      variables: { organizationId },
      skip: !organizationId,
    }
  );

  // Get categories
  const { data: categoriesData, loading: categoriesLoading } = useQuery(
    GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY,
    {
      variables: { organizationId },
      skip: !organizationId,
    }
  );

  // Delete mutations
  const [deleteTag, { loading: deletingTagLoading }] = useMutation(DELETE_TAG_MUTATION, {
    refetchQueries: [
      { query: GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY, variables: { organizationId } },
    ],
  });

  const [deleteCategory, { loading: deletingCategoryLoading }] = useMutation(
    DELETE_TAG_CATEGORY_MUTATION,
    {
      refetchQueries: [
        { query: GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY, variables: { organizationId } },
      ],
    }
  );

  const tags: ExerciseTag[] = (tagsData as ExerciseTagsResponse)?.exerciseTags || [];
  const categories: TagCategory[] = (categoriesData as TagCategoriesResponse)?.tagsByOrganizationId || [];

  // Filter
  const filteredTags = tags.filter((tag) =>
    matchesSearchQuery(tag.name, searchQuery) ||
    matchesSearchQuery(tag.description, searchQuery)
  );

  const filteredCategories = categories.filter((cat) =>
    matchesSearchQuery(cat.name, searchQuery) ||
    matchesSearchQuery(cat.description, searchQuery)
  );

  const handleEditTag = (tag: ExerciseTag) => {
    setEditingTag(tag);
    setIsTagDialogOpen(true);
  };

  const handleDeleteTag = async () => {
    if (!deletingTag) return;
    try {
      await deleteTag({ variables: { tagId: deletingTag.id } });
      toast.success("Tag został usunięty");
      setDeletingTag(null);
    } catch (error) {
      console.error("Błąd podczas usuwania:", error);
      toast.error("Nie udało się usunąć tagu");
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    try {
      await deleteCategory({ variables: { categoryId: deletingCategory.id } });
      toast.success("Kategoria została usunięta");
      setDeletingCategory(null);
    } catch (error) {
      console.error("Błąd podczas usuwania:", error);
      toast.error("Nie udało się usunąć kategorii");
    }
  };

  const handleCloseDialog = () => {
    setIsTagDialogOpen(false);
    setEditingTag(null);
  };

  const loading = tagsLoading || categoriesLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tagi i kategorie</h1>
          <p className="text-muted-foreground">
            Zarządzaj tagami dla ćwiczeń
          </p>
        </div>
        <Button onClick={() => setIsTagDialogOpen(true)} disabled={!organizationId}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj tag
        </Button>
      </div>

      {/* Search */}
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Szukaj tagów..."
        className="max-w-sm"
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "tags" | "categories")}>
        <TabsList>
          <TabsTrigger value="tags" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tagi ({filteredTags.length})
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Kategorie ({filteredCategories.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tags" className="mt-6">
          {loading ? (
            <LoadingState type="row" count={5} />
          ) : filteredTags.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={Tag}
                  title={searchQuery ? "Nie znaleziono tagów" : "Brak tagów"}
                  description={
                    searchQuery
                      ? "Spróbuj zmienić kryteria wyszukiwania"
                      : "Dodaj pierwszy tag do biblioteki"
                  }
                  actionLabel={!searchQuery ? "Dodaj tag" : undefined}
                  onAction={!searchQuery ? () => setIsTagDialogOpen(true) : undefined}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {filteredTags.map((tag) => (
                <TagCard
                  key={tag.id}
                  tag={tag}
                  onEdit={handleEditTag}
                  onDelete={(t) => setDeletingTag(t)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          {loading ? (
            <LoadingState type="row" count={5} />
          ) : filteredCategories.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={FolderOpen}
                  title={searchQuery ? "Nie znaleziono kategorii" : "Brak kategorii"}
                  description={
                    searchQuery
                      ? "Spróbuj zmienić kryteria wyszukiwania"
                      : "Kategorie pomagają organizować tagi"
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {filteredCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onDelete={(c) => setDeletingCategory(c)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Tag Dialog */}
      {organizationId && (
        <TagDialog
          open={isTagDialogOpen}
          onOpenChange={handleCloseDialog}
          tag={editingTag}
          organizationId={organizationId}
        />
      )}

      {/* Delete Tag Confirmation */}
      <ConfirmDialog
        open={!!deletingTag}
        onOpenChange={(open) => !open && setDeletingTag(null)}
        title="Usuń tag"
        description={`Czy na pewno chcesz usunąć tag "${deletingTag?.name}"?`}
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleDeleteTag}
        isLoading={deletingTagLoading}
      />

      {/* Delete Category Confirmation */}
      <ConfirmDialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
        title="Usuń kategorię"
        description={`Czy na pewno chcesz usunąć kategorię "${deletingCategory?.name}"?`}
        confirmText="Usuń"
        variant="destructive"
        onConfirm={handleDeleteCategory}
        isLoading={deletingCategoryLoading}
      />
    </div>
  );
}

