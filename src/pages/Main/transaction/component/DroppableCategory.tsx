import React, { useState } from 'react'
import { useDrop, DropTargetMonitor } from 'react-dnd'
import { DragItem } from './Item'

interface Props {
  // eslint-disable-next-line no-unused-vars
  onDrop: (name: string) => void
}

const DroppableCategory: React.FC<Props> = ({ onDrop }) => {
  const [items, setItems] = useState<DragItem>({
    type: '',
    id: '',
    name: '',
    project: '',
    description: '',
  }) // Initialize itemName to the default text
  const [{ canDrop, isOver }, drop] = useDrop<
    DragItem,
    void,
    { isOver: boolean; canDrop: boolean }
  >(() => ({
    accept: 'box',
    drop: (item: DragItem) => {
      setItems({
        ...items,
        name: item.name,
        description: item.description,
        project: item.project,
      })
      onDrop(item.name)
    },
    collect: (monitor: DropTargetMonitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }))

  const isActive = canDrop && isOver
  const backgroundColor = isActive ? 'bg-gray-100' : 'bg-white'
  return (
    // <div ref={drop} style={{ backgroundColor }}>
    //   Drop here
    // </div>

    <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 [&>*]:px-6 [&>*]:py-4">
      <td className="">
        {items.project ? (
          <div className="h-10">
            <p className="p-2 text-left">{items.project}</p>
          </div>
        ) : null}
      </td>
      <td
        className={`px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white ${backgroundColor}`}
        ref={drop}
      >
        {items.name ? (
          <div className="border-dotted border-2 border-sky-500 rounded-md h-10">
            <p className="p-2 text-left">{items.name}</p>
          </div>
        ) : null}
      </td>
      <td className="">
        {items.description ? (
          <div className="h-10">
            <p className="p-2 text-left">{items.description}</p>
          </div>
        ) : null}
      </td>
      <td className="">
        {items.description ? (
          <div className="h-10">
            <p className="p-2 text-left">{items.description}</p>
          </div>
        ) : null}
      </td>
      <td className="">
        {items.description ? (
          <div className="h-10">
            <p className="p-2 text-left">{items.description}</p>
          </div>
        ) : null}
      </td>
      <td className="">
        {items.description ? (
          <div className="h-10">
            <p className="p-2 text-left">{items.description}</p>
          </div>
        ) : null}
      </td>
      <td className="">
        {items.description ? (
          <div className="h-10">
            <p className="p-2 text-right">{items.description}</p>
          </div>
        ) : null}
      </td>
    </tr>

    // <td
    //   className={`px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white ${backgroundColor}`}
    //   ref={drop}
    // >
    //   {itemName ? (
    //     <div className="border-dotted border-2 border-sky-500 rounded-md h-10">
    //       <p className="p-2 text-center">{itemName}</p>
    //     </div>

    //   ) : null}
    // </td>
  )
}

export default DroppableCategory
