'use client'

import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center'
import { useConfigStore } from './stores/config-store'
import { CARD_SPACING } from '@/consts'
import { useCategories } from '@/hooks/use-categories'
import { useBlogIndex } from '@/hooks/use-blog-index'
import Link from 'next/link'
import { HomeDraggableLayer } from './home-draggable-layer'

export default function CategoryCard() {
	const center = useCenterStore()
	const { cardStyles } = useConfigStore()
	const { categories } = useCategories()
	const { items } = useBlogIndex()
	const styles = cardStyles.categoryCard
	const hiCardStyles = cardStyles.hiCard
	const socialButtonsStyles = cardStyles.socialButtons

	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x + hiCardStyles.width / 2 - socialButtonsStyles.width
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y + hiCardStyles.height / 2 + CARD_SPACING + socialButtonsStyles.height + CARD_SPACING

	return (
		<HomeDraggableLayer cardKey='categoryCard' x={x} y={y} width={styles.width} height={styles.height}>
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y}>
				<div className='flex items-center justify-between'>
					<h2 className='text-secondary text-sm'>文章分类</h2>
					<Link href='/blog' className='text-brand text-xs hover:opacity-70'>
						全部
					</Link>
				</div>

				<div className='mt-3 space-y-2'>
					{categories.map(category => (
						<Link
							key={category}
							href={`/blog?category=${encodeURIComponent(category)}`}
							className='flex items-center justify-between rounded-xl bg-white/40 px-3 py-2 text-sm transition-colors hover:bg-white/70'>
							<span>{category}</span>
							<span className='text-secondary text-xs'>{items.filter(item => item.category === category).length} 篇</span>
						</Link>
					))}
				</div>
			</Card>
		</HomeDraggableLayer>
	)
}
