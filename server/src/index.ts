import { Hono } from 'hono'
import './db'
import trivia from './routes/trivia'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.route('/solve/trivia', trivia)

export default { 
  port: 3003, 
  fetch: app.fetch, 
} 
