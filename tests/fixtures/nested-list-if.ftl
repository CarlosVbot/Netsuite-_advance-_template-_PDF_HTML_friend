<#list record.item as item><#if item.quantity gt 0><#if item.rate gt 0><tr><td>${item.item}</td></tr></#if></#if></#list>
