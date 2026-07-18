import blogIndex from '@/../public/blogs/index.json'
import type { BlogIndexItem } from '@/app/blog/types'
import ArticlePageClient from './article-page-client'

const posts = blogIndex as BlogIndexItem[]

type PageProps = {
	params: Promise<{ id: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
	const params = posts.filter(post => post.slug).map(post => ({ id: post.slug }))

	return params.length > 0 ? params : [{ id: '__placeholder__' }]
}

export default async function Page({ params }: PageProps) {
	const { id } = await params

	return <ArticlePageClient slug={id} />
}
