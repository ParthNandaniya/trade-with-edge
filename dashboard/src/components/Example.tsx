import React from 'react'

interface ExampleProps {
  title?: string
}

const Example: React.FC<ExampleProps> = ({ title = 'Example Component' }) => {
  return (
    <div>
      <h2>{title}</h2>
      <p>This is an example component in TypeScript</p>
    </div>
  )
}

export default Example

