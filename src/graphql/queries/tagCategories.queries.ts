import { gql } from "@apollo/client";

// Fragment dla podstawowych danych kategorii tagów
export const TAG_CATEGORY_BASIC_FRAGMENT = gql`
  fragment TagCategoryBasicFragment on TagCategory {
    id
    name
    color
    isActive
  }
`;

// Fragment dla pełnych danych kategorii
export const TAG_CATEGORY_FULL_FRAGMENT = gql`
  fragment TagCategoryFullFragment on TagCategory {
    id
    creationTime
    name
    color
    description
    icon
    isActive
    organizationId
    createdById
  }
`;

// Query do pobierania kategorii tagów dla organizacji
export const GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY = gql`
  query GetTagCategoriesByOrganization($organizationId: String!) {
    tagsByOrganizationId(organizationId: $organizationId) {
      ...TagCategoryFullFragment
    }
  }
  ${TAG_CATEGORY_FULL_FRAGMENT}
`;

// Query do pobierania pojedynczej kategorii
export const GET_TAG_CATEGORY_BY_ID_QUERY = gql`
  query GetTagCategoryById($id: String!) {
    tagCategoryById(id: $id) {
      ...TagCategoryFullFragment
    }
  }
  ${TAG_CATEGORY_FULL_FRAGMENT}
`;

