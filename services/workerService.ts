/**
 * Web Worker管理服务
 * 提供异步JSON解析和其他计算密集型操作
 */

// 等待中的请求
interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

class WorkerService {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestId: number = 0;
  private isSupported: boolean = typeof Worker !== 'undefined';

  /**
   * 初始化Worker
   */
  init() {
    if (!this.isSupported) {
      console.warn('Web Workers are not supported in this environment');
      return;
    }

    if (this.worker) return;

    try {
      // 使用Vite的Worker导入方式
      this.worker = new Worker(
        new URL('../workers/jsonParser.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event) => {
        const { type, id, data, error } = event.data;
        const pending = this.pendingRequests.get(id);
        
        if (pending) {
          if (type === 'result') {
            pending.resolve(data);
          } else if (type === 'error') {
            pending.reject(new Error(error));
          }
          this.pendingRequests.delete(id);
        }
      };

      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
      };
    } catch (error) {
      console.warn('Failed to initialize Worker:', error);
      this.isSupported = false;
    }
  }

  /**
   * 使用Worker解析JSON
   * 如果Worker不可用，回退到主线程解析
   */
  async parseJSON<T>(jsonString: string): Promise<T> {
    // 如果Worker不可用或字符串很短，直接在主线程解析
    if (!this.isSupported || !this.worker || jsonString.length < 1000) {
      return this.fallbackParse<T>(jsonString);
    }

    return new Promise((resolve, reject) => {
      const id = `parse_${++this.requestId}`;
      this.pendingRequests.set(id, { resolve, reject });
      
      this.worker!.postMessage({
        type: 'parse',
        id,
        data: jsonString
      });

      // 设置超时
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          // 超时后回退到主线程解析
          resolve(this.fallbackParse<T>(jsonString));
        }
      }, 5000);
    });
  }

  /**
   * 使用Worker序列化对象
   */
  async stringifyJSON(obj: any): Promise<string> {
    if (!this.isSupported || !this.worker) {
      return JSON.stringify(obj, null, 2);
    }

    return new Promise((resolve, reject) => {
      const id = `stringify_${++this.requestId}`;
      this.pendingRequests.set(id, { resolve, reject });
      
      this.worker!.postMessage({
        type: 'stringify',
        id,
        data: obj
      });

      // 设置超时
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          resolve(JSON.stringify(obj, null, 2));
        }
      }, 5000);
    });
  }

  /**
   * 主线程回退解析
   */
  private fallbackParse<T>(jsonString: string): T {
    let str = jsonString;
    const jsonMatch = str.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      str = jsonMatch[1];
    }
    return JSON.parse(str) as T;
  }

  /**
   * 销毁Worker
   */
  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }
}

// 导出单例
export const workerService = new WorkerService();
