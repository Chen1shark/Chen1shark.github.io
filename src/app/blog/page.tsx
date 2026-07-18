'use client'

import Link from 'next/link'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import { motion } from 'motion/react'

dayjs.extend(weekOfYear)
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { INIT_DELAY } from '@/consts'
import ShortLineSVG from '@/svgs/short-line.svg'
import { useBlogIndex, type BlogIndexItem } from '@/hooks/use-blog-index'
import { useCategories } from '@/hooks/use-categories'
import { useAuthStore } from '@/hooks/use-auth'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import { readFileAsText } from '@/lib/file-utils'
import { cn } from '@/lib/utils'
import { saveBlogEdits } from './services/save-blog-edits'
import { Check } from 'lucide-react'
import { BlogCoverHoverPreview, useBlogCoverHover } from './components/blog-cover-hover'
import { CategoryModal } from './components/category-modal'
import { useRouter, useSearchParams } from 'next/navigation'

type DisplayMode = 'day' | 'week' | 'month' | 'year' | 'category'

export default function BlogPage() {
	return (
		<Suspense fallback={<div className='text-secondary py-24 text-center text-sm'>加载文章...</div>}>
			<BlogContent />
		</Suspense>
	)
}

function BlogContent() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const requestedCategory = searchParams.get('category')?.trim() || ''
	const requestedTag = searchParams.get('tag')?.trim() || ''
	const requestedQuery = searchParams.get('q')?.trim() || ''
	const requestedDate = searchParams.get('date')?.trim() || ''
	const { items, loading } = useBlogIndex()
	const { categories: categoriesFromServer } = useCategories()
	const { isAuth, setPrivateKey } = useAuthStore()
	const { siteContent } = useConfigStore()
	const hideEditButton = siteContent.hideEditButton ?? false
	const enableCategories = siteContent.enableCategories ?? false

	const keyInputRef = useRef<HTMLInputElement>(null)
	const [editMode, setEditMode] = useState(false)
	const [editableItems, setEditableItems] = useState<BlogIndexItem[]>([])
	const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set())
	const [saving, setSaving] = useState(false)
	const [displayMode, setDisplayMode] = useState<DisplayMode>('year')
	const [categoryModalOpen, setCategoryModalOpen] = useState(false)
	const [categoryList, setCategoryList] = useState<string[]>([])
	const [newCategory, setNewCategory] = useState('')
	const [titleInput, setTitleInput] = useState(requestedQuery)
	const [tagInput, setTagInput] = useState(requestedTag)
	const [tagInputFocused, setTagInputFocused] = useState(false)

	const { cancelCoverPreview, onCoverLinkMouseEnter, hoverCoverPreview, mousePosition } = useBlogCoverHover(editMode)

	useEffect(() => {
		if (!editMode) {
			setEditableItems(items)
		}
	}, [items, editMode])

	useEffect(() => {
		setCategoryList(categoriesFromServer || [])
	}, [categoriesFromServer])

	const displayItems = (editMode ? editableItems : items).filter(item => {
		const matchedCategory = !requestedCategory || item.category === requestedCategory
		const matchedTag = !requestedTag || (item.tags || []).includes(requestedTag)
		const matchedQuery = !requestedQuery || (item.title || item.slug).toLowerCase().includes(requestedQuery.toLowerCase())
		const matchedDate = !requestedDate || dayjs(item.date).format('YYYY-MM-DD') === requestedDate
		return matchedCategory && matchedTag && matchedQuery && matchedDate
	})
	const tagScopeItems = (editMode ? editableItems : items).filter(item => !requestedCategory || item.category === requestedCategory)
	const availableTags = useMemo(() => {
		const tagCounts = new Map<string, number>()
		for (const item of tagScopeItems) {
			for (const tag of item.tags || []) {
				tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
			}
		}
		return Array.from(tagCounts.entries())
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.map(([tag, count]) => ({ tag, count }))
	}, [tagScopeItems])
	const suggestedTags = useMemo(() => {
		const keyword = tagInput.trim().replace(/^#+/, '').trim().toLowerCase()
		return availableTags
			.filter(item => !keyword || item.tag.toLowerCase().includes(keyword))
			.slice(0, 8)
	}, [availableTags, tagInput])
	const showTagSuggestions = tagInputFocused && suggestedTags.length > 0

	useEffect(() => {
		if (requestedCategory) setDisplayMode('category')
	}, [requestedCategory])

	useEffect(() => {
		setTagInput('')
	}, [requestedTag])

	useEffect(() => {
		setTitleInput(requestedQuery)
	}, [requestedQuery])

	const buildBlogHref = useCallback(
		(next: { category?: string; tag?: string; q?: string; date?: string }) => {
			const category = next.category ?? requestedCategory
			const tag = next.tag ?? requestedTag
			const q = next.q ?? requestedQuery
			const date = next.date ?? requestedDate
			const params = new URLSearchParams()
			if (category) params.set('category', category)
			if (tag) params.set('tag', tag)
			if (q) params.set('q', q)
			if (date) params.set('date', date)
			const query = params.toString()
			return query ? `/blog?${query}` : '/blog'
		},
		[requestedCategory, requestedTag, requestedQuery, requestedDate]
	)

	const handleTagClick = useCallback(
		(event: { preventDefault: () => void; stopPropagation: () => void }, tag: string) => {
			event.preventDefault()
			event.stopPropagation()
			router.push(buildBlogHref({ tag }))
		},
		[buildBlogHref, router]
	)

	const handleTagSubmit = useCallback(
		(event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault()
			const tag = tagInput.trim().replace(/^#+/, '').trim()
			setTagInputFocused(false)
			router.push(buildBlogHref({ tag }))
		},
		[buildBlogHref, router, tagInput]
	)

	const handleTitleSubmit = useCallback(
		(event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault()
			router.push(buildBlogHref({ q: titleInput.trim() }))
		},
		[buildBlogHref, router, titleInput]
	)

	const handleTagSuggestionSelect = useCallback(
		(tag: string) => {
			setTagInput(tag)
			setTagInputFocused(false)
			router.push(buildBlogHref({ tag }))
		},
		[buildBlogHref, router]
	)

	const { groupedItems, groupKeys, getGroupLabel } = useMemo(() => {
		const sorted = [...displayItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

		const grouped = sorted.reduce(
			(acc, item) => {
				let key: string
				let label: string
				const date = dayjs(item.date)

				switch (displayMode) {
					case 'category':
						key = item.category || '未分类'
						label = key
						break
					case 'day':
						key = date.format('YYYY-MM-DD')
						label = date.format('YYYY年MM月DD日')
						break
					case 'week':
						const week = date.week()
						key = `${date.format('YYYY')}-W${week.toString().padStart(2, '0')}`
						label = `${date.format('YYYY')}年第${week}周`
						break
					case 'month':
						key = date.format('YYYY-MM')
						label = date.format('YYYY年MM月')
						break
					case 'year':
					default:
						key = date.format('YYYY')
						label = date.format('YYYY年')
						break
				}

				if (!acc[key]) {
					acc[key] = { items: [], label }
				}
				acc[key].items.push(item)
				return acc
			},
			{} as Record<string, { items: BlogIndexItem[]; label: string }>
		)

		const keys = Object.keys(grouped).sort((a, b) => {
			if (displayMode === 'category') {
				const categoryOrder = new Map(categoryList.map((c, index) => [c, index]))
				const aOrder = categoryOrder.has(a) ? categoryOrder.get(a)! : Number.MAX_SAFE_INTEGER
				const bOrder = categoryOrder.has(b) ? categoryOrder.get(b)! : Number.MAX_SAFE_INTEGER
				if (aOrder !== bOrder) return aOrder - bOrder
				return a.localeCompare(b)
			}
			// 按时间倒序排序
			if (displayMode === 'week') {
				// 周格式：YYYY-WW
				const [yearA, weekA] = a.split('-W').map(Number)
				const [yearB, weekB] = b.split('-W').map(Number)
				if (yearA !== yearB) return yearB - yearA
				return weekB - weekA
			}
			return b.localeCompare(a)
		})

		return {
			groupedItems: grouped,
			groupKeys: keys,
			getGroupLabel: (key: string) => grouped[key]?.label || key
		}
	}, [displayItems, displayMode, categoryList])

	const selectedCount = selectedSlugs.size
	const buttonText = isAuth ? '保存' : '导入密钥'

	const toggleEditMode = useCallback(() => {
		if (editMode) {
			setEditMode(false)
			setEditableItems(items)
			setSelectedSlugs(new Set())
		} else {
			setEditableItems(items)
			setEditMode(true)
		}
	}, [editMode, items])

	const toggleSelect = useCallback((slug: string) => {
		setSelectedSlugs(prev => {
			const next = new Set(prev)
			if (next.has(slug)) {
				next.delete(slug)
			} else {
				next.add(slug)
			}
			return next
		})
	}, [])

	// 全选所有文章
	const handleSelectAll = useCallback(() => {
		setSelectedSlugs(new Set(editableItems.map(item => item.slug)))
	}, [editableItems])

	// 全选/取消全选某个时间维度分组
	const handleSelectGroup = useCallback(
		(groupKey: string) => {
			const group = groupedItems[groupKey]
			if (!group) return

			// 检查该分组是否所有文章都已选中
			const allSelected = group.items.every(item => selectedSlugs.has(item.slug))

			setSelectedSlugs(prev => {
				const next = new Set(prev)
				if (allSelected) {
					// 如果已全选，则取消该分组的选择
					group.items.forEach(item => {
						next.delete(item.slug)
					})
				} else {
					// 如果未全选，则全选该分组
					group.items.forEach(item => {
						next.add(item.slug)
					})
				}
				return next
			})
		},
		[groupedItems, selectedSlugs]
	)

	// 取消全选
	const handleDeselectAll = useCallback(() => {
		setSelectedSlugs(new Set())
	}, [])

	const handleItemClick = useCallback(
		(event: React.MouseEvent, slug: string) => {
			if (!editMode) return
			event.preventDefault()
			event.stopPropagation()
			toggleSelect(slug)
		},
		[editMode, toggleSelect]
	)

	const handleDeleteSelected = useCallback(() => {
		if (selectedCount === 0) {
			toast.info('请选择要删除的文章')
			return
		}
		setEditableItems(prev => prev.filter(item => !selectedSlugs.has(item.slug)))
		setSelectedSlugs(new Set())
	}, [selectedCount, selectedSlugs])

	const handleAssignCategory = useCallback((slug: string, category?: string) => {
		setEditableItems(prev =>
			prev.map(item => {
				if (item.slug !== slug) return item
				const nextCategory = category?.trim()
				if (!nextCategory) return { ...item, category: undefined }
				return { ...item, category: nextCategory }
			})
		)
	}, [])

	const handleAddCategory = useCallback(() => {
		const value = newCategory.trim()
		if (!value) {
			toast.info('请输入分类名称')
			return
		}
		setCategoryList(prev => (prev.includes(value) ? prev : [...prev, value]))
		setNewCategory('')
	}, [newCategory])

	const handleRemoveCategory = useCallback((category: string) => {
		setCategoryList(prev => prev.filter(item => item !== category))
		setEditableItems(prev => prev.map(item => (item.category === category ? { ...item, category: undefined } : item)))
	}, [])

	const handleReorderCategories = useCallback((nextList: string[]) => {
		setCategoryList(nextList)
	}, [])

	const handleCancel = useCallback(() => {
		setEditableItems(items)
		setSelectedSlugs(new Set())
		setEditMode(false)
	}, [items])

	const handleSave = useCallback(async () => {
		const removedSlugs = items.filter(item => !editableItems.some(editItem => editItem.slug === item.slug)).map(item => item.slug)
		const normalizedCategoryList = categoryList.map(c => c.trim()).filter(Boolean)
		const categoryListChanged = JSON.stringify(normalizedCategoryList) !== JSON.stringify((categoriesFromServer || []).map(c => c.trim()).filter(Boolean))
		const categoryAssignmentChanged = items.some(origin => {
			const next = editableItems.find(editItem => editItem.slug === origin.slug)
			const originCategory = origin.category || ''
			const nextCategory = next?.category || ''
			return originCategory !== nextCategory
		})
		const hasChanges = removedSlugs.length > 0 || categoryListChanged || categoryAssignmentChanged

		if (!hasChanges) {
			toast.info('没有需要保存的改动')
			return
		}

		try {
			setSaving(true)
			await saveBlogEdits(items, editableItems, normalizedCategoryList)
			setEditMode(false)
			setSelectedSlugs(new Set())
			setCategoryModalOpen(false)
		} catch (error: any) {
			console.error(error)
			toast.error(error?.message || '保存失败')
		} finally {
			setSaving(false)
		}
	}, [items, editableItems, categoryList, categoriesFromServer])

	const handleSaveClick = useCallback(() => {
		if (!isAuth) {
			keyInputRef.current?.click()
			return
		}
		void handleSave()
	}, [handleSave, isAuth])

	const handlePrivateKeySelection = useCallback(
		async (file: File) => {
			try {
				const pem = await readFileAsText(file)
				setPrivateKey(pem)
				toast.success('密钥导入成功，请再次点击保存')
			} catch (error) {
				console.error(error)
				toast.error('读取密钥失败')
			}
		},
		[setPrivateKey]
	)

	return (
		<>
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handlePrivateKeySelection(f)
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			<div className='flex flex-col items-center justify-center gap-6 px-6 pt-24 max-sm:pt-24'>
				{items.length > 0 && (
					<motion.div
						initial={{ opacity: 0, scale: 0.6 }}
						animate={{ opacity: 1, scale: 1 }}
						className='card btn-rounded relative mx-auto flex items-center gap-1 p-1 max-sm:hidden'>
						{[
							{ value: 'day', label: '日' },
							{ value: 'week', label: '周' },
							{ value: 'month', label: '月' },
							{ value: 'year', label: '年' },
							...(enableCategories ? ([{ value: 'category', label: '分类' }] as const) : [])
						].map(option => (
							<motion.button
								key={option.value}
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={() => setDisplayMode(option.value as DisplayMode)}
								className={cn(
									'btn-rounded px-3 py-1.5 text-xs font-medium transition-all',
									displayMode === option.value ? 'bg-brand text-white shadow-sm' : 'text-secondary hover:text-brand hover:bg-white/60'
								)}>
								{option.label}
							</motion.button>
						))}
					</motion.div>
				)}

				{items.length > 0 && (
					<motion.div
						initial={{ opacity: 0, y: -6 }}
						animate={{ opacity: 1, y: 0 }}
						className='card relative z-40 grid w-full max-w-[840px] grid-cols-2 gap-3 px-4 py-3 text-sm max-sm:grid-cols-1'>
						<form onSubmit={handleTitleSubmit} className='flex min-w-0 items-center gap-3 rounded-2xl bg-white/40 px-3 py-2'>
							<span className='text-secondary shrink-0'>标题搜索</span>
							<input
								value={titleInput}
								onChange={event => setTitleInput(event.target.value)}
								placeholder='输入标题关键词'
								className='min-w-0 flex-1 bg-transparent text-sm'
							/>
							<button type='submit' className='rounded-full bg-brand px-3 py-1.5 text-xs text-white transition-opacity hover:opacity-85'>
								搜索
							</button>
						</form>

						<form onSubmit={handleTagSubmit} className='relative flex min-w-0 items-center gap-3 rounded-2xl bg-white/40 px-3 py-2'>
							<span className='text-secondary shrink-0'>标签筛选</span>
							<div className='relative min-w-0 flex-1'>
								<input
									value={tagInput}
									onChange={event => setTagInput(event.target.value)}
									onFocus={() => setTagInputFocused(true)}
									onBlur={() => {
										window.setTimeout(() => setTagInputFocused(false), 120)
									}}
									placeholder='输入标签'
									className='w-full bg-transparent text-sm'
								/>
								{showTagSuggestions && (
									<div className='absolute top-full right-0 left-0 z-100 mt-4 overflow-hidden rounded-2xl border bg-white/95 p-1 shadow-sm backdrop-blur'>
										{suggestedTags.map(item => (
											<button
												key={item.tag}
												type='button'
												onMouseDown={event => event.preventDefault()}
												onClick={() => handleTagSuggestionSelect(item.tag)}
												className='flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-brand/10'>
												<span>#{item.tag}</span>
												<span className='text-secondary text-xs'>{item.count}</span>
											</button>
										))}
									</div>
								)}
							</div>
							<button type='submit' className='rounded-full bg-brand px-3 py-1.5 text-xs text-white transition-opacity hover:opacity-85'>
								筛选
							</button>
						</form>
					</motion.div>
				)}

				{(requestedCategory || requestedTag || requestedQuery || requestedDate) && (
					<motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className='card relative flex w-full max-w-[840px] flex-wrap items-center gap-3 px-4 py-3 text-sm'>
						<span className='text-secondary'>当前筛选</span>
						<span className='rounded-full bg-white/60 px-3 py-1'>{requestedCategory || '全部文章'}</span>
						{requestedTag && <span className='rounded-full bg-brand/10 px-3 py-1 text-brand'>#{requestedTag}</span>}
						{requestedQuery && <span className='rounded-full bg-white/60 px-3 py-1'>标题：{requestedQuery}</span>}
						{requestedDate && <span className='rounded-full bg-white/60 px-3 py-1'>日期：{requestedDate}</span>}
						{requestedTag && (
							<Link href={buildBlogHref({ tag: '' })} className='text-secondary hover:text-brand'>
								清除标签
							</Link>
						)}
						{requestedQuery && (
							<Link href={buildBlogHref({ q: '' })} className='text-secondary hover:text-brand'>
								清除搜索
							</Link>
						)}
						{requestedDate && (
							<Link href={buildBlogHref({ date: '' })} className='text-secondary hover:text-brand'>
								清除日期
							</Link>
						)}
						<Link href='/blog' className='text-secondary hover:text-brand'>
							全部文章
						</Link>
					</motion.div>
				)}

				{groupKeys.map((groupKey, index) => {
					const group = groupedItems[groupKey]
					if (!group) return null

					return (
						<motion.div
							onMouseLeave={cancelCoverPreview}
							key={groupKey}
							initial={{ opacity: 0, scale: 0.95 }}
							whileInView={{ opacity: 1, scale: 1 }}
							transition={{ delay: INIT_DELAY / 2 }}
							className='card relative w-full max-w-[840px] space-y-6'>
							<div className='mb-3 flex items-center justify-between gap-3 text-base'>
								<div className='flex items-center gap-3'>
									<div className='font-medium'>{getGroupLabel(groupKey)}</div>
									<div className='h-2 w-2 rounded-full bg-[#D9D9D9]'></div>
									<div className='text-secondary text-sm'>{group.items.length} 篇文章</div>
								</div>
								{editMode &&
									(() => {
										const groupAllSelected = group.items.every(item => selectedSlugs.has(item.slug))
										return (
											<motion.button
												whileHover={{ scale: 1.05 }}
												whileTap={{ scale: 0.95 }}
												onClick={() => handleSelectGroup(groupKey)}
												className={cn(
													'rounded-lg border px-3 py-1 text-xs transition-colors',
													groupAllSelected
														? 'border-brand/40 bg-brand/10 text-brand hover:bg-brand/20'
														: 'text-secondary hover:border-brand/40 hover:text-brand border-transparent bg-white/60 hover:bg-white/80'
												)}>
												{groupAllSelected ? '取消全选' : '全选该分组'}
											</motion.button>
										)
									})()}
							</div>
							<div>
								{group.items.map(it => {
									const isSelected = selectedSlugs.has(it.slug)
									return (
										<Link
											onMouseEnter={() => onCoverLinkMouseEnter(it.cover)}
											onMouseLeave={cancelCoverPreview}
											href={`/blog/${it.slug}`}
											key={it.slug}
											onClick={event => handleItemClick(event, it.slug)}
											className={cn(
												'group flex min-h-10 items-center gap-3 py-3 transition-all',
												editMode
													? cn(
															'rounded-lg border px-3',
															isSelected ? 'border-brand/60 bg-brand/5' : 'hover:border-brand/40 border-transparent hover:bg-white/60'
														)
													: 'cursor-pointer'
											)}>
											{editMode && (
												<span
													className={cn(
														'flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-semibold',
														isSelected ? 'border-brand bg-brand text-white' : 'border-[#D9D9D9] text-transparent'
													)}>
													<Check />
												</span>
											)}
											<span className='text-secondary w-[44px] shrink-0 text-sm font-medium'>{dayjs(it.date).format('MM-DD')}</span>

											<div className='relative flex h-2 w-2 items-center justify-center'>
												<div className='bg-secondary group-hover:bg-brand h-[5px] w-[5px] rounded-full transition-all group-hover:h-4'></div>
												<ShortLineSVG className='absolute bottom-4' />
											</div>
											<div
												className={cn(
													'min-w-0 flex-1 truncate text-sm font-medium transition-colors',
													editMode ? null : 'group-hover:text-brand'
												)}>
												{it.title || it.slug}
											</div>
											<div className='ml-auto flex max-w-[320px] shrink-0 flex-wrap items-center justify-end gap-2 max-sm:hidden'>
												{(it.tags || []).map(t => (
													<span
														key={t}
														role='link'
														tabIndex={0}
														onClick={event => handleTagClick(event, t)}
														onKeyDown={event => {
															if (event.key === 'Enter' || event.key === ' ') handleTagClick(event, t)
														}}
														className={cn('text-secondary cursor-pointer text-sm hover:text-brand', requestedTag === t && 'text-brand')}>
														#{t}
													</span>
												))}
											</div>
										</Link>
									)
								})}
							</div>
						</motion.div>
					)
				})}
			</div>

			<div className='pt-12'>
				{!loading && items.length === 0 && <div className='text-secondary py-6 text-center text-sm'>暂无文章</div>}
				{!loading && items.length > 0 && groupKeys.length === 0 && <div className='text-secondary py-6 text-center text-sm'>没有匹配文章</div>}
				{loading && <div className='text-secondary py-6 text-center text-sm'>加载中...</div>}
			</div>

			<motion.div
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1 }}
				className='absolute top-4 right-6 flex items-center gap-3 max-sm:hidden'>
				{editMode ? (
					<>
						{enableCategories && (
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={() => setCategoryModalOpen(true)}
								disabled={saving}
								className='rounded-xl border bg-white/60 px-4 py-2 text-sm transition-colors hover:bg-white/80'>
								分类
							</motion.button>
						)}
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleCancel}
							disabled={saving}
							className='rounded-xl border bg-white/60 px-6 py-2 text-sm'>
							取消
						</motion.button>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={selectedCount === editableItems.length ? handleDeselectAll : handleSelectAll}
							className='rounded-xl border bg-white/60 px-4 py-2 text-sm transition-colors hover:bg-white/80'>
							{selectedCount === editableItems.length ? '取消全选' : '全选'}
						</motion.button>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleDeleteSelected}
							disabled={selectedCount === 0}
							className='rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 transition-colors disabled:opacity-60'>
							删除(已选:{selectedCount}篇)
						</motion.button>
						<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSaveClick} disabled={saving} className='brand-btn px-6'>
							{saving ? '保存中...' : buttonText}
						</motion.button>
					</>
				) : (
					!hideEditButton && (
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={toggleEditMode}
							className='bg-card rounded-xl border px-6 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/80'>
							编辑
						</motion.button>
					)
				)}
			</motion.div>

			<BlogCoverHoverPreview preview={hoverCoverPreview} position={mousePosition} />

			<CategoryModal
				open={categoryModalOpen}
				onClose={() => setCategoryModalOpen(false)}
				categoryList={categoryList}
				newCategory={newCategory}
				onNewCategoryChange={setNewCategory}
				onAddCategory={handleAddCategory}
				onRemoveCategory={handleRemoveCategory}
				onReorderCategories={handleReorderCategories}
				editableItems={editableItems}
				onAssignCategory={handleAssignCategory}
			/>
		</>
	)
}
