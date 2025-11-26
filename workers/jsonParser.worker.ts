/**
 * JSON解析Web Worker
 * 将JSON解析从主线程移出，避免阻塞UI
 */

// Worker消息类型
interface WorkerMessage {
  type: 'parse' | 'stringify';
  id: string;
  data: string | object;
}

interface WorkerResponse {
  type: 'result' | 'error';
  id: string;
  data?: any;
  error?: string;
}

// 处理消息
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, id, data } = event.data;

  try {
    let result: any;

    if (type === 'parse') {
      // 解析JSON字符串
      let jsonStr = data as string;
      
      // 处理可能被包裹在markdown代码块中的JSON
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      
      result = JSON.parse(jsonStr);
    } else if (type === 'stringify') {
      // 序列化对象为JSON字符串
      result = JSON.stringify(data, null, 2);
    }

    const response: WorkerResponse = {
      type: 'result',
      id,
      data: result
    };
    
    self.postMessage(response);
  } catch (error) {
    const response: WorkerResponse = {
      type: 'error',
      id,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    self.postMessage(response);
  }
};

// 导出空对象使TypeScript满意
export {};
