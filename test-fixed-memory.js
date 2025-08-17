console.log('🔥 ТЕСТ ИСПРАВЛЕННОЙ ПАМЯТИ ИИ')
console.log('============================')

const userId = '5c182cab-c364-43f0-b7c8-584c5e02c7f2'
const vercelURL = 'https://arcanum-platform.vercel.app'

async function testFixedMemory() {
  try {
    console.log('\n⏱️ Ждем 30 секунд пока Vercel развернет исправления...')
    await new Promise(resolve => setTimeout(resolve, 30000))
    
    console.log('\n🧪 Тестирование исправленного ИИ...')
    
    const testQuestions = [
      'Расскажи мне о моей цели в сфере S9 - финансы и капитал',
      'Какая у меня конкретная финансовая цель и когда дедлайн?',
      'Покажи мои цели по всем активным сферам S1-S9'
    ]
    
    for (let i = 0; i < testQuestions.length; i++) {
      const question = testQuestions[i]
      console.log(`\n${i+1}️⃣ Вопрос: "${question}"`)
      
      try {
        const response = await fetch(`${vercelURL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: question,
            userId: userId,
            model: 'gpt-4o-mini'
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          const aiResponse = data.response || ''
          
          console.log('✅ ИИ ответил!')
          console.log('📄 Ответ (первые 300 символов):')
          console.log('"' + aiResponse.substring(0, 300) + '..."')
          
          // Проверяем упоминает ли ИИ РЕАЛЬНЫЕ данные
          const checks = [
            { keyword: '2000', description: 'цель $2000' },
            { keyword: '$2000', description: 'точную сумму $2000' },
            { keyword: '24.01.2026', description: 'точный дедлайн' },
            { keyword: '2026', description: 'год дедлайна' },
            { keyword: 'пассивный доход', description: 'тип дохода' },
            { keyword: 'пассивного дохода', description: 'тип дохода (склонение)' },
            { keyword: 'ААА+', description: 'приоритет ААА+' }
          ]
          
          let foundReal = 0
          checks.forEach(check => {
            if (aiResponse.includes(check.keyword)) {
              console.log(`  ✅ Упомянул ${check.description}`)
              foundReal++
            }
          })
          
          if (foundReal >= 2) {
            console.log(`🎉 УСПЕХ! ИИ использует РЕАЛЬНУЮ память (${foundReal}/7 ключевых слов)`)
          } else if (foundReal >= 1) {
            console.log(`⚠️ Частичный успех (${foundReal}/7 ключевых слов)`)
          } else {
            console.log(`❌ ИИ НЕ использует реальную память (0/7 ключевых слов)`)
          }
          
          // Проверяем дефолтные фразы которые НЕ должны появляться
          const badPhrases = [
            'Задачи не найдены',
            'добавь цель в любой сфере',
            'S1 (50%), S2 (50%), S3 (50%)'
          ]
          
          badPhrases.forEach(phrase => {
            if (aiResponse.includes(phrase)) {
              console.log(`  ❌ Все еще показывает дефолтную фразу: "${phrase}"`)
            }
          })
          
        } else if (response.status === 402) {
          console.log('⚠️ Лимит токенов достигнут (402) - ожидаемо')
        } else {
          console.log('❌ API ошибка:', response.status)
        }
        
      } catch (error) {
        console.log('❌ Ошибка запроса:', error.message)
      }
      
      // Пауза между вопросами
      if (i < testQuestions.length - 1) {
        console.log('\n⏳ Пауза 5 секунд...')
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
    
  } catch (error) {
    console.log('💥 Критическая ошибка:', error.message)
  }
}

// Запускаем тест
testFixedMemory().then(() => {
  console.log('\n🏁 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО!')
  console.log('\n📋 ИТОГ:')
  console.log('Если ИИ упоминает $2000, 2026, пассивный доход - ИСПРАВЛЕНИЕ РАБОТАЕТ!')
  console.log('Если показывает "Задачи не найдены" - нужны дополнительные исправления')
}).catch(err => {
  console.error('💥 Ошибка:', err)
}) 