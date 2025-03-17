import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useNavigation } from '@/context/NavigationContext'
import StudySessionsTable from '@/components/StudySessionsTable'
import Pagination from '@/components/Pagination'
import { StudySessionSortKey } from '@/services/api'

type Session = {
  id: number
  group_name: string
  group_id: number
  activity_id: number
  activity_name: string
  start_time: string
  end_time: string
  review_items_count: number
}

type StudyActivity = {
  id: number
  preview_url: string
  title: string
  description: string
  launch_url: string
}

type PaginatedSessions = {
  items: Session[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

const ITEMS_PER_PAGE = 10

export default function StudyActivityShow() {
  const { id } = useParams<{ id: string }>()
  const { setCurrentStudyActivity } = useNavigation()
  const [activity, setActivity] = useState<StudyActivity | null>(null)
  const [sessionData, setSessionData] = useState<PaginatedSessions | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<StudySessionSortKey>('start_time')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return

      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`http://localhost:5000/api/study-activities/${id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch study activity')
        }
        const data = await response.json()
        setActivity(data)
        setCurrentStudyActivity(data)

        // Fetch sessions for the current page
        const sessionsResponse = await fetch(
          `http://localhost:5000/api/study-activities/${id}/sessions?page=${currentPage}&per_page=${ITEMS_PER_PAGE}`
        )
        if (!sessionsResponse.ok) {
          throw new Error('Failed to fetch sessions')
        }
        const sessionsData = await sessionsResponse.json()
        setSessionData({
          items: sessionsData.items.map((item: any) => ({
            id: item.id,
            group_name: item.group_name,
            group_id: item.group_id,
            activity_id: item.activity_id,
            activity_name: item.activity_name,
            start_time: item.start_time,
            end_time: item.end_time,
            review_items_count: item.review_items_count
          })),
          total: sessionsData.total,
          page: sessionsData.page,
          per_page: sessionsData.per_page,
          total_pages: sessionsData.total_pages
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, currentPage, setCurrentStudyActivity])

  const exportToCSV = () => {
    const csvRows = []
    csvRows.push(['ID', 'Activity Name', 'Group Name', 'Start Time', 'End Time', 'Review Items Count'].join(','))

    const filteredSessions = sessionData?.items.filter(session => {
      const query = searchQuery.toLowerCase()
      return (
        session.activity_name.toLowerCase().includes(query) || session.group_name.toLowerCase().includes(query)
      )
    }) || []

    filteredSessions.forEach(session => {
      const row = [
        session.id,
        session.activity_name,
        session.group_name,
        session.start_time,
        session.end_time,
        session.review_items_count
      ]
      csvRows.push(row.join(','))
    })

    const csvString = csvRows.join('\n')
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.setAttribute('href', URL.createObjectURL(blob))
    link.setAttribute('download', 'study_sessions.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Clean up when unmounting
  useEffect(() => {
    return () => {
      setCurrentStudyActivity(null)
    }
  }, [setCurrentStudyActivity])

  const handleSort = (key: StudySessionSortKey) => {
    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortKey(key)
    setSortDirection(newDirection)

    const sortedSessions = [...(sessionData?.items ?? [])].sort((a, b) => {
      const aValue = a[key]
      const bValue = b[key]
      if (aValue < bValue) return newDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return newDirection === 'desc' ? 1 : -1
      return 0
    })

    setSessionData((prev) => ({
      ...prev!,
      items: sortedSessions,
    }))
  }

  if (loading) {
    return <div className="text-center py-4">Loading...</div>
  }

  if (error || !activity) {
    return <div className="text-red-500 text-center py-4">{error || 'Activity not found'}</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{activity.title}</h1>
        <Link
          to="/study-activities"
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          Back to Activities
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="relative">
          <img
            src={activity.preview_url}
            alt={activity.title}
            className="inset-0 w-[600px] h-[400px] aspect-ratio bg-gray-900"
          />
        </div>
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-300 mb-4">{activity.description}</p>
          <div className="space-y-4">
            <div className="flex">
              <Link
                to={`/study-activities/${id}/launch`}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md"
              >
                Launch
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-md p-6'>
        <input
          type='text'
          placeholder='Search sessions...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className='p-2 border border-gray-300 rounded-md mb-4'
        />
        <button
          onClick={exportToCSV}
          className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mb-4'
        >
          Export to CSV
        </button>
      </div>

      {sessionData && sessionData.items.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Study Sessions</h2>
          <StudySessionsTable
            sessions={sessionData.items}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          {sessionData.total_pages > 1 && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={sessionData.total_pages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}