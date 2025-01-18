import os
import boto3
import streamlit as st
from typing import List, Dict

def initialize_bedrock_client():
    region = "us-west-2"
    kb_id = "L3ENSK42QL"
    client = boto3.client("bedrock-agent-runtime", region_name=region)
    return client, kb_id

def query_knowledge_base(client, kb_id, input_text, ver, temperature, top_p, chat_history):
    # チャット履歴をプロンプトに組み込む
    conversation_context = "\n".join([
        f"ユーザー: {msg['user']}\nアシスタント: {msg['assistant']}"
        for msg in chat_history[-10:]  # 直近10の会話のみを使用
    ])
    
    prompt_with_history = f"""
    これまでの会話：
    {conversation_context}
    
    新しい質問：
    {input_text}
    """
    
    filter = {
        "equals": {
            "key": "ver", 
            "value": str(ver),
        }
    }
    
    response = client.retrieve_and_generate_stream(
        input={"text": prompt_with_history},
        retrieveAndGenerateConfiguration={
            "knowledgeBaseConfiguration": {
                "generationConfiguration": {
                    "promptTemplate": {
                        "textPromptTemplate": """
                        以下の検索結果を参考に、これまでの会話の文脈を踏まえて回答してください：
                        '$search_results$'
                        回答フォーマット：
                        ---
                        【参照ドキュメント】
                        - 参照したドキュメントのタイトルを記載
                        - 参照したドキュメントのページ
                        【回答】
                        具体的な回答内容
                        ---
                        注意事項：
                        - 検索結果が存在する場合は、必ず参照したドキュメントのタイトルとどのページに記載されているかを記載すること
                        - 検索結果が存在しない場合は、「【参考情報】」と記載して回答すること
                        - 回答は上記のフォーマットに従って構造化すること
                        - 前の会話の文脈を考慮して回答すること
                        """
                    },
                    "inferenceConfig": {
                        "textInferenceConfig": {
                            "maxTokens": 4000,
                            "temperature": temperature,
                            "topP": top_p
                        }
                    }
                },
                "knowledgeBaseId": kb_id,
                "modelArn": "arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
                "retrievalConfiguration": {
                    "vectorSearchConfiguration": {
                        "filter": filter,
                        "numberOfResults": 5,
                    }
                },
            },
            "type": "KNOWLEDGE_BASE",
        },
    )
    
    return response.get("stream")

def initialize_chat_history():
    if "messages" not in st.session_state:
        st.session_state.messages = []

def add_message(role: str, content: str):
    st.session_state.messages.append({"role": role, "content": content})

def display_chat_messages():
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

def main():
    st.title("AWS Bedrock チャットボット")
    
    # Initialize Bedrock client
    client, kb_id = initialize_bedrock_client()
    
    # Initialize chat history
    initialize_chat_history()
    
    # Sidebar configurations
    with st.sidebar:
        st.header("メタデータ")
        ver = st.selectbox("AWS CLI バージョン:", options=[2, 1], index=0)
        
        st.subheader("パラメータ")
        temperature = st.slider("温度", min_value=0.0, max_value=1.0, value=0.1, step=0.1)
        top_p = st.slider("トップ P", min_value=0.0, max_value=1.0, value=0.9, step=0.1)
        
        if st.button("会話をクリア"):
            st.session_state.messages = []
            st.rerun()
    
    # Display chat history
    display_chat_messages()
    
    # Chat input
    if prompt := st.chat_input("メッセージを入力してください"):
        # Add user message to chat history
        add_message("user", prompt)
        
        # Display user message
        with st.chat_message("user"):
            st.markdown(prompt)
        
        # Generate and display assistant response
        with st.chat_message("assistant"):
            message_placeholder = st.empty()
            full_response = ""
            
            try:
                stream = query_knowledge_base(
                    client, 
                    kb_id, 
                    prompt, 
                    ver, 
                    temperature, 
                    top_p,
                    [{"user": msg["content"], "assistant": st.session_state.messages[i+1]["content"]}
                     for i, msg in enumerate(st.session_state.messages[:-1:2])]
                )
                
                if stream:
                    for event in stream:
                        if "output" in event:
                            chunk = event['output']['text']
                            full_response += chunk
                            message_placeholder.markdown(full_response + "▌")
                    
                    message_placeholder.markdown(full_response)
                    
                    # Add assistant response to chat history
                    add_message("assistant", full_response)
                
            except Exception as e:
                st.error(f"エラーが発生しました: {str(e)}")

if __name__ == "__main__":
    main()