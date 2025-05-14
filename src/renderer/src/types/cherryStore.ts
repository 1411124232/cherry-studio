export enum CherryStoreType {
  ASSISTANT = 'Assistant',
  MINI_APP = 'Mini-App',
  KNOWLEDGE = 'Knowledge',
  MCP_SERVER = 'MCP-Server',
  MODEL_PROVIDER = 'Model-Provider',
  AGENT = 'Agent'
}
export interface CherryStoreBaseItem {
  id: string
  title: string
  description: string
  categoryId: string
  subcategoryId: string
  author: string
  image: string
  tags: string[]
  // rating: number
  // downloads: string
  // featured: boolean
  // requirements: string[]
}

export interface SubCategoryItem {
  id: string
  name: string
  count?: number // count 是可选的，因为并非所有二级分类都有
  isActive?: boolean
}

export interface Category {
  id: string
  title: string
  items: SubCategoryItem[]
}

export interface AssistantItem extends CherryStoreBaseItem {
  type: CherryStoreType.ASSISTANT
  icon?: string
  prompt?: string
}

export type CherryStoreItem = AssistantItem
