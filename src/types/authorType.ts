export interface AuthorType {
    id: string, // Usually the name as well - yaml / json key. Used as tag to group posts by author.
    name: string,
    description: string,
    url: string,
    image_url?: string,
    title?: string,
    email?: string
}
