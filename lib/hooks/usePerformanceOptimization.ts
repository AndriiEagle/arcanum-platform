// Хук для оптимизации производительности paywall компонентов
// Максимизирует скорость загрузки и отзывчивость UI для увеличения конверсии

import { useCallback, useMemo, useRef, useEffect, useState } from 'react'

// Дебаунс для оптимизации частых вызовов
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Троттлинг для ограничения частоты вызовов
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef<number>(0)
  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastCall.current >= delay) {
        lastCall.current = now
        return callback(...args)
      }
    },
    [callback, delay]
  ) as T

  return throttledCallback
}

// Ленивая загрузка компонентов с прелоадером
export function useLazyLoad<T>(
  loader: () => Promise<T>,
  dependencies: any[] = []
): {
  component: T | null
  isLoading: boolean
  error: Error | null
} {
  const [component, setComponent] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadComponent = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const loadedComponent = await loader()
        if (!cancelled) {
          setComponent(loadedComponent)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadComponent()

    return () => {
      cancelled = true
    }
  }, dependencies)

  return { component, isLoading, error }
}

// Мемоизация селекторов для предотвращения лишних перерендеров
export function useMemoizedSelector<T, R>(
  selector: (state: T) => R,
  state: T,
  equalityFn?: (a: R, b: R) => boolean
): R {
  const memoizedSelector = useMemo(() => {
    let lastResult: R
    let lastState: T

    return (currentState: T): R => {
      if (currentState !== lastState) {
        const newResult = selector(currentState)
        
        if (equalityFn && lastResult !== undefined) {
          if (!equalityFn(lastResult, newResult)) {
            lastResult = newResult
          }
        } else {
          lastResult = newResult
        }
        
        lastState = currentState
      }
      
      return lastResult
    }
  }, [selector, equalityFn])

  return memoizedSelector(state)
}

// Оптимизация для отслеживания видимости элементов
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): {
  isIntersecting: boolean
  entry: IntersectionObserverEntry | null
} {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)

  useEffect(() => {
    const element = ref.current

    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
        setEntry(entry)
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [ref, options])

  return { isIntersecting, entry }
}

// Батчинг состояний для уменьшения количества рендеров
export function useBatchedState<T>(
  initialState: T,
  batchTime: number = 16
): [T, (newState: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(initialState)
  const pendingUpdates = useRef<((prev: T) => T)[]>([])
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const batchedSetState = useCallback((newState: T | ((prev: T) => T)) => {
    const updater = typeof newState === 'function' 
      ? newState as (prev: T) => T
      : () => newState

    pendingUpdates.current.push(updater)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setState(prevState => {
        let nextState = prevState
        pendingUpdates.current.forEach(update => {
          nextState = update(nextState)
        })
        pendingUpdates.current = []
        return nextState
      })
      timeoutRef.current = null
    }, batchTime)
  }, [batchTime])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return [state, batchedSetState]
}

// Кэширование дорогих вычислений с TTL
export function useCachedComputation<T, Args extends any[]>(
  computation: (...args: Args) => T,
  dependencies: Args,
  ttl: number = 60000 // 1 минута по умолчанию
): T {
  const cache = useRef<{
    result: T
    timestamp: number
    deps: Args
  } | null>(null)

  return useMemo(() => {
    const now = Date.now()
    
    if (
      cache.current &&
      now - cache.current.timestamp < ttl &&
      JSON.stringify(cache.current.deps) === JSON.stringify(dependencies)
    ) {
      return cache.current.result
    }

    const result = computation(...dependencies)
    cache.current = {
      result,
      timestamp: now,
      deps: dependencies
    }

    return result
  }, [computation, ttl, ...dependencies])
}

// Отслеживание производительности компонентов
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0)
  const mountTime = useRef(Date.now())
  const lastRenderTime = useRef(Date.now())

  useEffect(() => {
    renderCount.current++
    const now = Date.now()
    const timeSinceMount = now - mountTime.current
    const timeSinceLastRender = now - lastRenderTime.current

    console.log(`🔍 ${componentName} Performance:`, {
      renderCount: renderCount.current,
      timeSinceMount: `${timeSinceMount}ms`,
      timeSinceLastRender: `${timeSinceLastRender}ms`,
      timestamp: new Date().toLocaleTimeString()
    })

    lastRenderTime.current = now
  })

  useEffect(() => {
    return () => {
      const totalTime = Date.now() - mountTime.current
      console.log(`📊 ${componentName} Final Stats:`, {
        totalRenders: renderCount.current,
        totalLifetime: `${totalTime}ms`,
        avgRenderTime: `${totalTime / renderCount.current}ms`
      })
    }
  }, [componentName])

  return {
    renderCount: renderCount.current,
    timeSinceMount: Date.now() - mountTime.current
  }
}

// Предзагрузка ресурсов для лучшего UX
export function usePrefetch(urls: string[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return

    const linkElements: HTMLLinkElement[] = []

    urls.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = url
      document.head.appendChild(link)
      linkElements.push(link)
    })

    return () => {
      linkElements.forEach(link => {
        if (link.parentNode) {
          link.parentNode.removeChild(link)
        }
      })
    }
  }, [urls, enabled])
}

// Оптимизированный хук для работы с формами
export function useOptimizedForm<T extends Record<string, any>>(
  initialValues: T,
  validationSchema?: (values: T) => Record<keyof T, string | null>
) {
  const [values, setValues] = useBatchedState<T>(initialValues)
  const [errors, setErrors] = useState<Record<keyof T, string | null>>({} as any)
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as any)

  const debouncedValues = useDebounce(values, 300)

  const validateField = useCallback((field: keyof T, value: any) => {
    if (validationSchema) {
      const fieldErrors = validationSchema({ ...values, [field]: value })
      setErrors(prev => ({ ...prev, [field]: fieldErrors[field] }))
    }
  }, [values, validationSchema])

  const handleChange = useCallback((field: keyof T) => (value: any) => {
    setValues(prev => ({ ...prev, [field]: value }))
    if (touched[field]) {
      validateField(field, value)
    }
  }, [setValues, touched, validateField])

  const handleBlur = useCallback((field: keyof T) => () => {
    setTouched(prev => ({ ...prev, [field]: true }))
    validateField(field, values[field])
  }, [setTouched, validateField, values])

  useEffect(() => {
    if (validationSchema) {
      const allErrors = validationSchema(debouncedValues)
      setErrors(allErrors)
    }
  }, [debouncedValues, validationSchema])

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setValues,
    isValid: Object.values(errors).every(error => !error)
  }
}

// Хук для оптимизации списков с виртуализацией
export function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleStart = Math.floor(scrollTop / itemHeight)
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  )

  const visibleItems = useMemo(
    () => items.slice(visibleStart, visibleEnd),
    [items, visibleStart, visibleEnd]
  )

  const totalHeight = items.length * itemHeight
  const offsetY = visibleStart * itemHeight

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop)
    }
  }
}

// Экспорт всех хуков
export {
  useDebounce,
  useThrottle,
  useLazyLoad,
  useMemoizedSelector,
  useIntersectionObserver,
  useBatchedState,
  useCachedComputation,
  usePerformanceMonitor,
  usePrefetch,
  useOptimizedForm,
  useVirtualList
} 