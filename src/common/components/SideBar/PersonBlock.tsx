import React, { FC } from 'react'
import { useSelector } from 'react-redux'
import { Avatar } from '@material-tailwind/react'
import { HiOutlineUserCircle } from 'react-icons/hi'
import { capitalAtFirstLetter } from '@/common/utils/helper'
import { RootState } from '@/redux/store'

interface PersonBlockProps {
  /** The narrow sidebar: the avatar alone, with the name as its tooltip. */
  collapsed?: boolean
}

/**
 * Who is signed in, just above Log-out. The church card at the top of the sidebar says which
 * church; this says who.
 */
const PersonBlock: FC<PersonBlockProps> = ({ collapsed = false }) => {
  const user = useSelector((s: RootState) => s.common.user)
  const name =
    [
      capitalAtFirstLetter(user?.firstName),
      capitalAtFirstLetter(user?.lastName),
    ]
      .filter(Boolean)
      .join(' ') ||
    user?.email ||
    ''

  const avatar = user?.img_url ? (
    <Avatar
      src={user.img_url}
      alt=""
      size="sm"
      className="h-[30px] w-[30px] shrink-0 ring-1 ring-white/50"
    />
  ) : (
    <HiOutlineUserCircle
      size={30}
      aria-hidden="true"
      className="shrink-0 text-white"
    />
  )

  if (collapsed) {
    return (
      <div className="flex justify-center pt-6" title={name}>
        {avatar}
        <span className="sr-only">{name}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-x-8 px-8 pt-4">
      {avatar}
      <p className="min-w-0 truncate text-sm text-white" title={name}>
        {name}
      </p>
    </div>
  )
}

export default PersonBlock
