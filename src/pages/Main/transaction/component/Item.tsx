import React, { FC, useState } from 'react'
import { DragSourceMonitor, useDrag } from 'react-dnd'
import { FiEdit } from 'react-icons/fi'
// import { FundProps } from '..'
import ItemSetting from './ItemSetting'

interface ItemProps {
  // data: FundProps
  // modifiedData: FundProps[] | null
  // setModifiedData: any
  // index: number
}

export interface DragItem {
  type: string
  id: string
  name: string
  project: string
  description: string
}

const Item: FC<ItemProps> = (
  {
    // data,
    // modifiedData,
    // setModifiedData,
    // index,
  },
) => {
  // const [{ isDragging }, drag] = useDrag<
  //   DragItem,
  //   void,
  //   { isDragging: boolean }
  // >({
  //   type: 'box',
  //   item: {
  //     id: Math.random().toString(),
  //     name: data.attributes.name,
  //     project: data.project,
  //     description: data.description,
  //     type: 'box',
  //   },
  //   collect: (monitor: DragSourceMonitor) => ({
  //     isDragging: monitor.isDragging(),
  //   }),
  // })

  const handleBtnEdit = (index: number) => {
    // if (modifiedData) {
    //   const updatedData = modifiedData.map((item, i) => {
    //     if (i === index) {
    //       return { ...item, isClick: !item.isClick }
    //     }
    //     return { ...item, isClick: false }
    //   })
    //   setModifiedData(updatedData)
    // }
  }

  return (
    <div
      className="p-4 shadow-sm bg-slate-100 rounded-lg  relative cursor-pointer"
      // ref={drag}
      // style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div
        className="hover:bg-green-500 cursor-pointer rounded-md p-2 absolute top-2 right-2 group"
        // onClick={() => handleBtnEdit(index)}
      >
        <FiEdit className="group-hover:text-white" size={14} />
      </div>
      {/* {data.isClick && <ItemSetting />} */}
      {/* <p>{data.attributes.name}</p> */}
    </div>
  )
}

export default Item
