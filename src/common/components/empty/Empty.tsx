import React, { FC } from 'react'

interface EmptyProps {}

const Empty: FC<EmptyProps> = ({}) => {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <p className="text-4xl font-bold text-slate-500">Data not found</p>
    </div>
  )
}

export default Empty
