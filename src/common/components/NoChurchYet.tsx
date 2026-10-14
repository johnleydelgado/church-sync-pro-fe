import React, { FC, useState } from 'react'
import { Button } from '@material-tailwind/react'
import { FiPlus } from 'react-icons/fi'
import { MdChurch } from 'react-icons/md'
import AddChurchModal from '@/pages/Main/churches/AddChurchModal'

/**
 * In place of a page that works on a church, for someone who belongs to none. Adding one selects
 * it, and the page they asked for appears.
 */
const NoChurchYet: FC = () => {
  const [adding, setAdding] = useState(false)

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
      <MdChurch size={40} className="text-blue-400" aria-hidden="true" />
      <p className="max-w-md text-2xl font-thin">
        You&apos;re not on a church yet. Add one, or ask a church&apos;s owner
        to invite you.
      </p>
      <Button
        className="flex items-center justify-center gap-2 bg-primary text-white rounded-lg h-10 px-4 normal-case"
        onClick={() => setAdding(true)}
      >
        <FiPlus size={18} aria-hidden="true" />
        <span>Add church</span>
      </Button>
      <AddChurchModal open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}

export default NoChurchYet
