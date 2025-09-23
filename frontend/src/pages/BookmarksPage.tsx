import { Bookmark, Search } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Calendar, Download, Eye, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getLanguageName } from '@/utils/language'

interface BookmarkedDocument {
	id: string
	title: string
	description?: string
	language: string
	category: {
		id: string
		name: string
		icon: string
	}
	tags: string[]
	uploader: {
		firstName: string
		lastName: string
	}
	downloadCount: number
	viewCount: number
	averageRating: number
	createdAt: string
	bookmarkedAt: string
	isPublic: boolean
	isPremium: boolean
	isApproved: boolean
}

export default function BookmarksPage() {
	const [searchQuery, setSearchQuery] = useState('')
	const [sortBy, setSortBy] = useState('recent')
	const [isLoading] = useState(false)

	// Mock data - replace with actual API call
	const bookmarkedDocuments: BookmarkedDocument[] = [
		{
			id: '1',
			title: 'Advanced React Patterns and Best Practices',
			description: 'Comprehensive guide to advanced React patterns including hooks, context, and performance optimization.',
			language: 'en',
			category: { id: '1', name: 'Web Development', icon: '🌐' },
			tags: ['react', 'javascript', 'frontend', 'patterns'],
			uploader: { firstName: 'John', lastName: 'Doe' },
			downloadCount: 1250,
			viewCount: 3200,
			averageRating: 4.8,
			createdAt: '2024-01-15T10:30:00Z',
			bookmarkedAt: '2024-01-20T14:22:00Z',
			isPublic: true,
			isPremium: false,
			isApproved: true,
		},
		{
			id: '2',
			title: 'Machine Learning Fundamentals',
			description: 'Introduction to machine learning concepts, algorithms, and practical applications.',
			language: 'en',
			category: { id: '2', name: 'Data Science', icon: '📊' },
			tags: ['machine-learning', 'python', 'ai', 'data-science'],
			uploader: { firstName: 'Jane', lastName: 'Smith' },
			downloadCount: 890,
			viewCount: 2100,
			averageRating: 4.6,
			createdAt: '2024-01-10T09:15:00Z',
			bookmarkedAt: '2024-01-18T16:45:00Z',
			isPublic: true,
			isPremium: true,
			isApproved: true,
		},
	]

	const filteredDocuments = bookmarkedDocuments.filter(doc =>
		doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
		doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
		doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
	)

	const sortedDocuments = [...filteredDocuments].sort((a, b) => {
		switch (sortBy) {
			case 'recent':
				return new Date(b.bookmarkedAt).getTime() - new Date(a.bookmarkedAt).getTime()
			case 'title':
				return a.title.localeCompare(b.title)
			case 'rating':
				return b.averageRating - a.averageRating
			case 'downloads':
				return b.downloadCount - a.downloadCount
			default:
				return 0
		}
	})

	return (
		<div className="container mx-auto px-4 py-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold flex items-center gap-2">
						<Bookmark className="h-8 w-8 text-primary" />
						My Bookmarks
					</h1>
					<p className="text-muted-foreground mt-1">
						Your saved documents and resources
					</p>
				</div>
				<Badge variant="secondary" className="text-sm">
					{bookmarkedDocuments.length} bookmarks
				</Badge>
			</div>

			{/* Search and Filters */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Search className="h-5 w-5" />
						Search Bookmarks
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex gap-4">
						<div className="flex-1">
							<Input
								placeholder="Search by title, description, or tags..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full"
							/>
						</div>
						<Select value={sortBy} onValueChange={setSortBy}>
							<SelectTrigger className="w-48">
								<SelectValue placeholder="Sort by" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="recent">Recently Bookmarked</SelectItem>
								<SelectItem value="title">Title A-Z</SelectItem>
								<SelectItem value="rating">Highest Rated</SelectItem>
								<SelectItem value="downloads">Most Downloaded</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Bookmarks List */}
			{isLoading ? (
				<div className="space-y-4">
					{Array.from({ length: 3 }).map((_, i) => (
						<Card key={i}>
							<CardContent className="p-6">
								<div className="space-y-3">
									<Skeleton className="h-6 w-3/4" />
									<Skeleton className="h-4 w-full" />
									<Skeleton className="h-4 w-1/2" />
									<div className="flex gap-2">
										<Skeleton className="h-6 w-16" />
										<Skeleton className="h-6 w-20" />
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			) : sortedDocuments.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<Bookmark className="h-12 w-12 text-muted-foreground mb-4" />
						<h3 className="text-lg font-medium text-muted-foreground mb-2">
							{searchQuery ? 'No bookmarks found' : 'No bookmarks yet'}
						</h3>
						<p className="text-sm text-muted-foreground text-center max-w-md">
							{searchQuery
								? 'Try adjusting your search terms or browse documents to bookmark them.'
								: 'Start bookmarking documents you find useful. Click the bookmark icon on any document to save it here.'}
						</p>
						{!searchQuery && (
							<Button asChild className="mt-4">
								<Link to="/documents">Browse Documents</Link>
							</Button>
						)}
					</CardContent>
				</Card>
			) : (
				<div className="space-y-4">
					{sortedDocuments.map((document) => (
						<Card key={document.id} className="hover:shadow-md transition-shadow">
							<CardContent className="p-6">
								<div className="flex items-start justify-between">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-2">
											<Link
												to={`/documents/${document.id}`}
												className="text-lg font-semibold hover:text-primary transition-colors"
											>
												{document.title}
											</Link>
											{document.isPremium && (
												<Badge variant="default" className="text-xs">Premium</Badge>
											)}
											{!document.isPublic && (
												<Badge variant="secondary" className="text-xs">Private</Badge>
											)}
										</div>

										{document.description && (
											<p className="text-sm text-muted-foreground mb-3 line-clamp-2">
												{document.description}
											</p>
										)}

										{/* Author and Stats */}
										<div className="flex items-center gap-4 mb-3">
											<div className="flex items-center gap-2">
												<Avatar className="h-6 w-6">
													<AvatarFallback className="text-xs">
														{document.uploader.firstName.charAt(0)}
														{document.uploader.lastName.charAt(0)}
													</AvatarFallback>
												</Avatar>
												<span className="text-sm text-muted-foreground">
													{document.uploader.firstName} {document.uploader.lastName}
												</span>
											</div>
											<Separator orientation="vertical" className="h-4" />
											<div className="flex items-center gap-4 text-sm text-muted-foreground">
												<div className="flex items-center gap-1">
													<Download className="h-3 w-3" />
													<span>{document.downloadCount}</span>
												</div>
												<div className="flex items-center gap-1">
													<Eye className="h-3 w-3" />
													<span>{document.viewCount}</span>
												</div>
												<div className="flex items-center gap-1">
													<Star className="h-3 w-3" />
													<span>{document.averageRating.toFixed(1)}</span>
												</div>
											</div>
										</div>

										{/* Category and Tags */}
										<div className="flex items-center gap-2 mb-3">
											<Badge variant="secondary" className="text-xs">
												<span className="mr-1">{document.category.icon}</span>
												{document.category.name}
											</Badge>
											<Badge variant="outline" className="text-xs">
												{getLanguageName(document.language)}
											</Badge>
											{document.tags.slice(0, 3).map((tag) => (
												<Badge key={tag} variant="outline" className="text-xs">
													{tag}
												</Badge>
											))}
											{document.tags.length > 3 && (
												<Badge variant="outline" className="text-xs">
													+{document.tags.length - 3} more
												</Badge>
											)}
										</div>

										{/* Bookmarked Date */}
										<div className="flex items-center gap-1 text-xs text-muted-foreground">
											<Calendar className="h-3 w-3" />
											<span>Bookmarked on {new Date(document.bookmarkedAt).toLocaleDateString()}</span>
										</div>
									</div>

									<div className="flex items-center gap-2 ml-4">
										<Button variant="outline" size="sm" asChild>
											<Link to={`/documents/${document.id}`}>
												View Document
											</Link>
										</Button>
										<Button variant="ghost" size="sm">
											<Bookmark className="h-4 w-4 text-primary" />
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	)
}