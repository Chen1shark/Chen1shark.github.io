'use client'

import Card from '@/components/card'
import { CARD_SPACING } from '@/consts'
import { useCenterStore } from '@/hooks/use-center'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useConfigStore } from './stores/config-store'
import { HomeDraggableLayer } from './home-draggable-layer'

export default function SearchCard() {
	const center = useCenterStore()
	const router = useRouter()
	const { cardStyles } = useConfigStore()
	const [keyword, setKeyword] = useState('')
	const styles = cardStyles.categoryCard
	const hiCardStyles = cardStyles.hiCard
	const socialButtonsStyles = cardStyles.socialButtons

	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x + hiCardStyles.width / 2 - socialButtonsStyles.width
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y + hiCardStyles.height / 2 + CARD_SPACING + socialButtonsStyles.height + CARD_SPACING
	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const value = keyword.trim()
		if (!value) return
		router.push(`/blog?q=${encodeURIComponent(value)}`)
	}

	return (
		<HomeDraggableLayer cardKey='categoryCard' x={x} y={y} width={styles.width} height={styles.height}>
			<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} className='flex items-center p-5'>
				<form onSubmit={handleSubmit} className='relative w-full'>
					<div className='flex items-center gap-3 rounded-xl border bg-white/50 px-4 py-2'>
						<Search className='text-secondary h-4 w-4 shrink-0' />
						<input
							value={keyword}
							onChange={event => setKeyword(event.target.value)}
							placeholder='输入标题关键词'
							className='w-full bg-transparent text-sm'
						/>
					</div>
				</form>
			</Card>
		</HomeDraggableLayer>
	)
}
